import fs from 'fs';
import csvParse from 'csv-parse';
import { In, getRepository } from 'typeorm';
import Category from '../models/Category';
import Transaction from '../models/Transaction';

interface TransactionCSVData {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(csvFilePath: string): Promise<Transaction[]> {
    // Logica de importação
    const readCSVStream = fs.createReadStream(csvFilePath);

    const parseStream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });

    const parseCSV = readCSVStream.pipe(parseStream);

    const transactions: TransactionCSVData[] = [];
    const categories: string[] = [];

    parseCSV.on('data', line => {
      // eslint-disable-next-line no-console
      const [title, type, value, category] = line;

      if (!title || !type || !value || !category) return;

      categories.push(category);

      transactions.push({
        title,
        type,
        value,
        category,
      });
    });

    await new Promise(resolve => parseCSV.on('end', resolve));

    // Logica de regra de negocio para inserir no banco
    const categoryRepository = getRepository(Category);

    const existentCategories = await categoryRepository.find({
      where: {
        title: In(categories),
      },
    });

    const existentCategoriesTitles = existentCategories.map(
      (category: Category) => category.title,
    );

    const addCategoriesTitles = categories
      .filter(category => !existentCategoriesTitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoryRepository.create(
      addCategoriesTitles.map(title => ({
        title,
      })),
    );

    await categoryRepository.save(newCategories);

    const finalCategories = [...existentCategories, ...newCategories];

    const transactionRepository = getRepository(Transaction);

    const newTransactions = transactionRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: finalCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionRepository.save(newTransactions);

    await fs.promises.unlink(csvFilePath);

    return newTransactions;
  }
}

export default ImportTransactionsService;
