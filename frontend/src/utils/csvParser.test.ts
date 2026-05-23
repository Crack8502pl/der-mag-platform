// src/utils/csvParser.test.ts
import { parseCSVColumn, parseCSVHeaders } from './csvParser';

describe('parseCSVColumn', () => {
  it('parsuje prosty CSV z separatorem ;', () => {
    const csv = 'Name;Age\nAlice;30\nBob;25';
    expect(parseCSVColumn(csv, 0)).toEqual(['Alice', 'Bob']);
  });

  it('obsługuje pola w cudzysłowach', () => {
    const csv = 'Name;City\n"Alice, Jr.";Warsaw\nBob;"New York"';
    expect(parseCSVColumn(csv, 1)).toEqual(['Warsaw', 'New York']);
  });

  it('deduplikuje wartości', () => {
    const csv = 'Name\nAlice\nBob\nAlice';
    expect(parseCSVColumn(csv, 0)).toEqual(['Alice', 'Bob']);
  });

  it('skipHeader=true pomija pierwszy wiersz', () => {
    const csv = 'header\nvalue1\nvalue2';
    expect(parseCSVColumn(csv, 0, ';', true)).toEqual(['value1', 'value2']);
  });

  it('skipHeader=false uwzględnia pierwszy wiersz', () => {
    const csv = 'header\nvalue1\nvalue2';
    expect(parseCSVColumn(csv, 0, ';', false)).toEqual(['header', 'value1', 'value2']);
  });

  it('pomija puste linie', () => {
    const csv = 'Name\nAlice\n\nBob\n';
    expect(parseCSVColumn(csv, 0)).toEqual(['Alice', 'Bob']);
  });

  it('pomija puste wartości w kolumnie', () => {
    const csv = 'A;B\n;value\nalso;';
    expect(parseCSVColumn(csv, 0)).toEqual(['also']);
  });

  it('obsługuje różne separatory', () => {
    const csv = 'A,B\nfoo,bar\nbaz,qux';
    expect(parseCSVColumn(csv, 1, ',')).toEqual(['bar', 'qux']);
  });

  it('obsługuje wieloliniowy CSV z różnymi kolumnami', () => {
    const csv = 'A;B;C\n1;2;3\n4;5;6';
    expect(parseCSVColumn(csv, 2)).toEqual(['3', '6']);
  });

  it('obsługuje zakończenia linii \\r\\n', () => {
    const csv = 'Name\r\nAlice\r\nBob';
    expect(parseCSVColumn(csv, 0)).toEqual(['Alice', 'Bob']);
  });

  it('zwraca pustą tablicę gdy columnIndex jest poza zakresem', () => {
    const csv = 'A;B\n1;2';
    expect(parseCSVColumn(csv, 5)).toEqual([]);
  });

  it('obsługuje cudzysłowy z podwójnym cudzysłowem wewnątrz', () => {
    // "" wewnątrz quoted field → jeden " w środku wartości
    const csv = 'Name\n"start ""middle"" end"';
    expect(parseCSVColumn(csv, 0)).toEqual(['start "middle" end']);
  });

  it('CSV bez nagłówka z skipHeader=false', () => {
    const csv = 'A;B\nC;D';
    expect(parseCSVColumn(csv, 0, ';', false)).toEqual(['A', 'C']);
  });
});

describe('parseCSVHeaders', () => {
  it('zwraca nazwy kolumn z pierwszego wiersza', () => {
    const csv = 'Name;Age;City\nAlice;30;Warsaw';
    expect(parseCSVHeaders(csv)).toEqual(['Name', 'Age', 'City']);
  });

  it('zwraca "Kolumna N" dla pustych nazw kolumn', () => {
    const csv = 'Name;;City';
    expect(parseCSVHeaders(csv)).toEqual(['Name', 'Kolumna 2', 'City']);
  });

  it('obsługuje zakończenia linii \\r\\n', () => {
    const csv = 'A;B\r\n1;2';
    expect(parseCSVHeaders(csv)).toEqual(['A', 'B']);
  });

  it('obsługuje różne separatory', () => {
    const csv = 'A,B,C';
    expect(parseCSVHeaders(csv, ',')).toEqual(['A', 'B', 'C']);
  });

  it('obsługuje nagłówki w cudzysłowach', () => {
    const csv = '"Imię";"Nazwisko"';
    expect(parseCSVHeaders(csv)).toEqual(['Imię', 'Nazwisko']);
  });
});
