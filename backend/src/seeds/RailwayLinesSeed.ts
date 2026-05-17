// backend/src/seeds/RailwayLinesSeed.ts
// Seed z danymi głównych linii PKP PLK S.A. na podstawie publicznie dostępnego rejestru UTK

import { AppDataSource } from '../config/database';
import { RailwayLine } from '../entities/RailwayLine.entity';

const RAILWAY_LINES_DATA = [
  { code: 'LK-1',   name: 'Warszawa Centralna – Katowice',                    kmFrom: 0, kmTo: 316, manager: 'PKP PLK S.A.' },
  { code: 'LK-2',   name: 'Warszawa Zachodnia – Terespol',                    kmFrom: 0, kmTo: 202, manager: 'PKP PLK S.A.' },
  { code: 'LK-3',   name: 'Legnica – Węgliniec – granica państwa',            kmFrom: 0, kmTo: 135, manager: 'PKP PLK S.A.' },
  { code: 'LK-4',   name: 'Grodzisk Mazowiecki – Zawiercie (CMK)',             kmFrom: 0, kmTo: 224, manager: 'PKP PLK S.A.' },
  { code: 'LK-6',   name: 'Czerwieńsk – Zbąszynek',                           kmFrom: 0, kmTo: 56,  manager: 'PKP PLK S.A.' },
  { code: 'LK-7',   name: 'Warszawa Wschodnia – Dorohusk',                    kmFrom: 0, kmTo: 311, manager: 'PKP PLK S.A.' },
  { code: 'LK-8',   name: 'Warszawa Zachodnia – Kraków Główny',               kmFrom: 0, kmTo: 295, manager: 'PKP PLK S.A.' },
  { code: 'LK-9',   name: 'Warszawa Wschodnia – Gdańsk Główny',               kmFrom: 0, kmTo: 340, manager: 'PKP PLK S.A.' },
  { code: 'LK-14',  name: 'Łódź Kaliska – Tuplice',                          kmFrom: 0, kmTo: 317, manager: 'PKP PLK S.A.' },
  { code: 'LK-20',  name: 'Tczew – Gdynia Główna',                           kmFrom: 0, kmTo: 52,  manager: 'PKP PLK S.A.' },
  { code: 'LK-21',  name: 'Kutno – Brodnica',                                 kmFrom: 0, kmTo: 169, manager: 'PKP PLK S.A.' },
  { code: 'LK-22',  name: 'Bydgoszcz Główna – Piła Główna',                  kmFrom: 0, kmTo: 89,  manager: 'PKP PLK S.A.' },
  { code: 'LK-25',  name: 'Spała – Łódź Fabryczna',                          kmFrom: 0, kmTo: 58,  manager: 'PKP PLK S.A.' },
  { code: 'LK-30',  name: 'Kraków Główny – Medyka',                          kmFrom: 0, kmTo: 270, manager: 'PKP PLK S.A.' },
  { code: 'LK-31',  name: 'Nowy Sącz – Chabówka',                            kmFrom: 0, kmTo: 68,  manager: 'PKP PLK S.A.' },
  { code: 'LK-33',  name: 'Opole Główne – Wrocław Główny',                   kmFrom: 0, kmTo: 79,  manager: 'PKP PLK S.A.' },
  { code: 'LK-38',  name: 'Poznań Główny – Wrocław Główny',                  kmFrom: 0, kmTo: 165, manager: 'PKP PLK S.A.' },
  { code: 'LK-45',  name: 'Oleśnica – Chojnów',                              kmFrom: 0, kmTo: 112, manager: 'PKP PLK S.A.' },
  { code: 'LK-61',  name: 'Nowe Brzesko – Rudzice',                          kmFrom: 0, kmTo: 32,  manager: 'PKP PLK S.A.' },
  { code: 'LK-65',  name: 'Skandawa – Blackowo',                              kmFrom: 0, kmTo: 219, manager: 'PKP PLK S.A.' },
  { code: 'LK-131', name: 'Chorzów Batory – Tczew',                          kmFrom: 0, kmTo: 363, manager: 'PKP PLK S.A.' },
  { code: 'LK-132', name: 'Bytom – Wrocław Główny',                          kmFrom: 0, kmTo: 175, manager: 'PKP PLK S.A.' },
  { code: 'LK-133', name: 'Dąbrowa Górnicza Ząbkowice – Katowice',           kmFrom: 0, kmTo: 25,  manager: 'PKP PLK S.A.' },
  { code: 'LK-136', name: 'Jaworzno Szczakowa – Gliwice',                    kmFrom: 0, kmTo: 37,  manager: 'PKP PLK S.A.' },
  { code: 'LK-137', name: 'Tychy – Katowice',                                kmFrom: 0, kmTo: 14,  manager: 'PKP PLK S.A.' },
  { code: 'LK-139', name: 'Czechowice-Dziedzice – Muszyna',                  kmFrom: 0, kmTo: 97,  manager: 'PKP PLK S.A.' },
  { code: 'LK-141', name: 'Nędza – Rybnik',                                  kmFrom: 0, kmTo: 16,  manager: 'PKP PLK S.A.' },
  { code: 'LK-143', name: 'Kalety – Pyskowice',                              kmFrom: 0, kmTo: 47,  manager: 'PKP PLK S.A.' },
  { code: 'LK-144', name: 'Tarnowskie Góry – Katowice',                      kmFrom: 0, kmTo: 39,  manager: 'PKP PLK S.A.' },
  { code: 'LK-147', name: 'Gliwice – Katowice Ligota',                       kmFrom: 0, kmTo: 26,  manager: 'PKP PLK S.A.' },
  { code: 'LK-149', name: 'Sosnowiec Główny – Katowice',                     kmFrom: 0, kmTo: 13,  manager: 'PKP PLK S.A.' },
  { code: 'LK-151', name: 'Tychy – Paprocany',                               kmFrom: 0, kmTo: 7,   manager: 'PKP PLK S.A.' },
  { code: 'LK-154', name: 'Gliwice – Knurów',                                kmFrom: 0, kmTo: 15,  manager: 'PKP PLK S.A.' },
  { code: 'LK-160', name: 'Bielsko-Biała – Zwardoń',                         kmFrom: 0, kmTo: 46,  manager: 'PKP PLK S.A.' },
  { code: 'LK-161', name: 'Nowy Sącz – Stróże',                             kmFrom: 0, kmTo: 11,  manager: 'PKP PLK S.A.' },
  { code: 'LK-163', name: 'Kraków Płaszów – Oświęcim',                      kmFrom: 0, kmTo: 51,  manager: 'PKP PLK S.A.' },
  { code: 'LK-171', name: 'Rzeszów Główny – Jasło',                          kmFrom: 0, kmTo: 100, manager: 'PKP PLK S.A.' },
  { code: 'LK-180', name: 'Chorzów Batory – Ruda Chebzie',                  kmFrom: 0, kmTo: 4,   manager: 'PKP PLK S.A.' },
  { code: 'LK-186', name: 'Dąbrowa Górnicza Strzemieszyce – Sławków',       kmFrom: 0, kmTo: 6,   manager: 'PKP PLK S.A.' },
  { code: 'LK-200', name: 'Bydgoszcz Wschód – Gdynia Główna',               kmFrom: 0, kmTo: 166, manager: 'PKP PLK S.A.' },
  { code: 'LK-201', name: 'Nowa Wieś Wielka – Maksymilianowo',              kmFrom: 0, kmTo: 24,  manager: 'PKP PLK S.A.' },
  { code: 'LK-202', name: 'Gdynia Główna – Gdynia Port',                    kmFrom: 0, kmTo: 5,   manager: 'PKP PLK S.A.' },
  { code: 'LK-203', name: 'Tczew – Kostrzyn',                               kmFrom: 0, kmTo: 219, manager: 'PKP PLK S.A.' },
  { code: 'LK-204', name: 'Malbork – Braniewo',                             kmFrom: 0, kmTo: 87,  manager: 'PKP PLK S.A.' },
  { code: 'LK-207', name: 'Toruń Wschód – Olsztyn Główny',                  kmFrom: 0, kmTo: 133, manager: 'PKP PLK S.A.' },
  { code: 'LK-208', name: 'Działdowo – Olsztyn Główny',                     kmFrom: 0, kmTo: 74,  manager: 'PKP PLK S.A.' },
  { code: 'LK-209', name: 'Olsztyn Główny – Bogaczewo',                     kmFrom: 0, kmTo: 95,  manager: 'PKP PLK S.A.' },
  { code: 'LK-210', name: 'Olsztyn Główny – Ełk',                           kmFrom: 0, kmTo: 127, manager: 'PKP PLK S.A.' },
  { code: 'LK-216', name: 'Grudziądz – Brodnica',                           kmFrom: 0, kmTo: 43,  manager: 'PKP PLK S.A.' },
  { code: 'LK-220', name: 'Sierpc – Nasielsk',                              kmFrom: 0, kmTo: 58,  manager: 'PKP PLK S.A.' },
  { code: 'LK-221', name: 'Tłuszcz – Ostrów Mazowiecka',                   kmFrom: 0, kmTo: 47,  manager: 'PKP PLK S.A.' },
  { code: 'LK-222', name: 'Ostrołęka – Łomża',                             kmFrom: 0, kmTo: 35,  manager: 'PKP PLK S.A.' },
  { code: 'LK-406', name: 'Kraków Główny – Kraków Płaszów (obwodowa)',     kmFrom: 0, kmTo: 8,   manager: 'PKP PLK S.A.' },
  { code: 'E-20',   name: 'Terespol – Frankfurt nad Odrą (linia E20)',      kmFrom: 0, kmTo: 669, manager: 'PKP PLK S.A.' },
  { code: 'E-30',   name: 'Zgorzelec – Medyka (linia E30)',                 kmFrom: 0, kmTo: 645, manager: 'PKP PLK S.A.' },
  { code: 'E-59',   name: 'Wrocław – Szczecin (linia E59)',                 kmFrom: 0, kmTo: 401, manager: 'PKP PLK S.A.' },
  { code: 'E-65',   name: 'Gdynia – Zebrzydowice (linia E65)',              kmFrom: 0, kmTo: 681, manager: 'PKP PLK S.A.' },
  { code: 'CE-20',  name: 'Łódź Fabryczna – Skierniewice (linia CE20)',     kmFrom: 0, kmTo: 85,  manager: 'PKP PLK S.A.' },
  { code: 'CE-30',  name: 'Kąty Wrocławskie – Opole (linia CE30)',          kmFrom: 0, kmTo: 64,  manager: 'PKP PLK S.A.' },
  { code: 'CE-65',  name: 'Grodzisk Mazowiecki – Zawiercie (CMK, CE65)',   kmFrom: 0, kmTo: 224, manager: 'PKP PLK S.A.' },
];

export class RailwayLinesSeed {
  /**
   * Idempotent seed – skips if railway_lines table already has data.
   */
  static async seed(): Promise<void> {
    const repo = AppDataSource.getRepository(RailwayLine);
    const count = await repo.count();
    if (count > 0) {
      console.log('   ✅ Linie kolejowe już istnieją – pomijam seedowanie');
      return;
    }

    const lines = RAILWAY_LINES_DATA.map(data =>
      repo.create({
        code: data.code,
        name: data.name,
        kmFrom: data.kmFrom,
        kmTo: data.kmTo,
        lengthKm: data.kmTo - data.kmFrom,
        manager: data.manager,
        active: true,
      })
    );

    await repo.save(lines);
    console.log(`   ✅ Linie kolejowe PKP PLK S.A. zainicjalizowane (${lines.length} linii)`);
  }
}
