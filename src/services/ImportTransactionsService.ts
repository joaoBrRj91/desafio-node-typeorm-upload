import fs from 'fs';
import csvParse from 'csv-parse';
// import Transaction from '../models/Transaction';

interface TransactionCSVData {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(csvFilePath: string): Promise<void> {
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
  }
}

export default ImportTransactionsService;
