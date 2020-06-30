import fs from 'fs';
import path from 'path';

export const readFile = (filepath: string) => {
  try {
    const data = fs.readFileSync(path.resolve(__dirname, filepath), 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.log(err);
    throw err;
  }
};
