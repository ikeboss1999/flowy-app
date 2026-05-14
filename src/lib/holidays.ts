/**
 * Utility for Austrian Public Holidays
 */

export interface Holiday {
    date: string; // YYYY-MM-DD
    name: string;
    isRegional?: boolean;
}

/**
 * Calculates Easter Sunday for a given year using the Meeus/Jones/Butcher algorithm
 */
function getEasterSunday(year: number): Date {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
}

export function getAustrianHolidays(year: number, state?: string): Holiday[] {
    const holidays: Holiday[] = [];
    const addHoliday = (date: Date, name: string, isRegional = false) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        holidays.push({ date: dateStr, name, isRegional });
    };

    // Fixed Holidays
    addHoliday(new Date(year, 0, 1), "Neujahr");
    addHoliday(new Date(year, 0, 6), "Hl. Drei Könige");
    addHoliday(new Date(year, 4, 1), "Staatsfeiertag");
    addHoliday(new Date(year, 7, 15), "Mariä Himmelfahrt");
    addHoliday(new Date(year, 9, 26), "Nationalfeiertag");
    addHoliday(new Date(year, 10, 1), "Allerheiligen");
    addHoliday(new Date(year, 11, 8), "Mariä Empfängnis");
    addHoliday(new Date(year, 11, 25), "Christtag");
    addHoliday(new Date(year, 11, 26), "Stefanitag");

    // Variable Holidays (based on Easter)
    const easterSunday = getEasterSunday(year);

    const ostermontag = new Date(easterSunday);
    ostermontag.setDate(easterSunday.getDate() + 1);
    addHoliday(ostermontag, "Ostermontag");

    const christiHimmelfahrt = new Date(easterSunday);
    christiHimmelfahrt.setDate(easterSunday.getDate() + 39);
    addHoliday(christiHimmelfahrt, "Christi Himmelfahrt");

    const pfingstmontag = new Date(easterSunday);
    pfingstmontag.setDate(easterSunday.getDate() + 50);
    addHoliday(pfingstmontag, "Pfingstmontag");

    const fronleichnam = new Date(easterSunday);
    fronleichnam.setDate(easterSunday.getDate() + 60);
    addHoliday(fronleichnam, "Fronleichnam");

    // Regional Holidays (Selection)
    if (state === 'B' || state === 'Burgenland') {
        addHoliday(new Date(year, 10, 11), "Hl. Martin", true);
    } else if (state === 'K' || state === 'Kärnten') {
        addHoliday(new Date(year, 2, 19), "Hl. Josef", true);
        addHoliday(new Date(year, 9, 10), "Tag der Volksabstimmung", true);
    } else if (state === 'N' || state === 'Niederösterreich') {
        addHoliday(new Date(year, 10, 15), "Hl. Leopold", true);
    } else if (state === 'O' || state === 'Oberösterreich') {
        addHoliday(new Date(year, 4, 4), "Hl. Florian", true);
    } else if (state === 'S' || state === 'Salzburg') {
        addHoliday(new Date(year, 8, 24), "Hl. Rupert", true);
    } else if (state === 'ST' || state === 'Steiermark') {
        addHoliday(new Date(year, 2, 19), "Hl. Josef", true);
    } else if (state === 'T' || state === 'Tirol') {
        addHoliday(new Date(year, 2, 19), "Hl. Josef", true);
    } else if (state === 'V' || state === 'Vorarlberg') {
        addHoliday(new Date(year, 2, 19), "Hl. Josef", true);
    } else if (state === 'W' || state === 'Wien') {
        addHoliday(new Date(year, 10, 15), "Hl. Leopold", true);
    }

    return holidays.sort((a, b) => a.date.localeCompare(b.date));
}

export function isAustrianHoliday(dateStr: string, state?: string): Holiday | null {
    const year = new Date(dateStr).getFullYear();
    const holidays = getAustrianHolidays(year, state);
    return holidays.find(h => h.date === dateStr) || null;
}
