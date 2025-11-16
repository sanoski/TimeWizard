from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, date, timedelta
import aiosqlite
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# SQLite database path
DB_PATH = ROOT_DIR / 'timesheet.db'

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Pydantic Models
class TimeEntry(BaseModel):
    id: Optional[int] = None
    work_date: str  # YYYY-MM-DD
    week_ending_date: str  # Saturday YYYY-MM-DD
    line_code: str
    st_hours: int = 0
    ot_hours: int = 0
    is_pay_week: bool = False
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class TimeEntryCreate(BaseModel):
    work_date: str
    line_code: str
    st_hours: int = 0
    ot_hours: int = 0

class LineCode(BaseModel):
    line_code: str
    label: str
    is_project: bool = False
    is_visible: bool = True
    sort_order: int = 0
    created_at: Optional[str] = None

class LineCodeCreate(BaseModel):
    line_code: str
    label: Optional[str] = None
    is_project: bool = False

class LineCodeUpdate(BaseModel):
    is_visible: bool

class Setting(BaseModel):
    key: str
    value: str
    updated_at: Optional[str] = None

class WeekInfo(BaseModel):
    week_ending_date: str
    is_pay_week: bool
    week_start: str
    week_end: str

class WeeklySummary(BaseModel):
    week_ending_date: str
    is_pay_week: bool
    total_st: int
    total_ot: int
    total_hours: int
    lines_used: List[str]
    daily_totals: dict
    line_totals: dict

# Database initialization
async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        # Time entries table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS time_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                work_date TEXT NOT NULL,
                week_ending_date TEXT NOT NULL,
                line_code TEXT NOT NULL,
                st_hours INTEGER DEFAULT 0,
                ot_hours INTEGER DEFAULT 0,
                is_pay_week INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(work_date, line_code)
            )
        ''')
        
        # Line codes table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS line_codes (
                line_code TEXT PRIMARY KEY,
                label TEXT NOT NULL,
                is_project INTEGER DEFAULT 0,
                is_visible INTEGER DEFAULT 1,
                sort_order INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Settings table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        await db.commit()
        
        # Initialize default line codes
        default_lines = [
            ('VTR', 'VTR', 0, 1, 1),
            ('GMRC', 'GMRC', 0, 1, 2),
            ('CLP', 'CLP', 0, 1, 3),
            ('WACR', 'WACR', 0, 1, 4),
            ('WACR-CRD', 'WACR-CRD', 0, 1, 5),
            ('NEGS', 'NEGS', 0, 1, 6),
            ('NHC', 'NHC', 0, 1, 7),
            ('NYOG', 'NYOG', 0, 1, 8),
            ('PTO', 'PTO', 0, 1, 9),
            ('HOLIDAY', 'HOLIDAY', 0, 1, 10),
        ]
        
        for line_code, label, is_project, is_visible, sort_order in default_lines:
            await db.execute(
                'INSERT OR IGNORE INTO line_codes (line_code, label, is_project, is_visible, sort_order) VALUES (?, ?, ?, ?, ?)',
                (line_code, label, is_project, is_visible, sort_order)
            )
        
        # Initialize default settings - Nov 22, 2025 is the pay week ending Saturday
        await db.execute(
            'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
            ('base_pay_week_ending', '2025-11-22')
        )
        await db.execute(
            'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
            ('pay_frequency_days', '14')
        )
        
        await db.commit()

# Helper functions for date calculations
def get_week_ending(work_date: date) -> date:
    """Get the Saturday (week ending) for a given date"""
    days_until_saturday = (5 - work_date.weekday()) % 7
    if days_until_saturday == 0 and work_date.weekday() != 5:
        days_until_saturday = 7
    return work_date + timedelta(days=days_until_saturday)

def is_pay_week(saturday: date, base_saturday: date) -> bool:
    """Check if a Saturday is a pay week"""
    diff = (saturday - base_saturday).days
    return diff % 14 == 0

def get_week_start(saturday: date) -> date:
    """Get Sunday of the week (6 days before Saturday)"""
    return saturday - timedelta(days=6)

# API Routes
@api_router.get("/")
async def root():
    return {"message": "VRS Time Wizard API"}

@api_router.get("/week-info")
async def get_week_info(work_date: str):
    """Get week ending date and pay week status for a given date"""
    try:
        work_date_obj = datetime.strptime(work_date, '%Y-%m-%d').date()
        week_ending = get_week_ending(work_date_obj)
        
        # Get base pay week from settings
        async with aiosqlite.connect(DB_PATH) as db:
            async with db.execute(
                'SELECT value FROM settings WHERE key = ?',
                ('base_pay_week_ending',)
            ) as cursor:
                row = await cursor.fetchone()
                base_date = datetime.strptime(row[0], '%Y-%m-%d').date() if row else date(2025, 11, 22)
        
        is_pay = is_pay_week(week_ending, base_date)
        week_start = get_week_start(week_ending)
        
        return WeekInfo(
            week_ending_date=week_ending.strftime('%Y-%m-%d'),
            is_pay_week=is_pay,
            week_start=week_start.strftime('%Y-%m-%d'),
            week_end=week_ending.strftime('%Y-%m-%d')
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/entries")
async def get_entries(week_ending: Optional[str] = None, start_date: Optional[str] = None, end_date: Optional[str] = None):
    """Get time entries by week or date range"""
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            if week_ending:
                query = 'SELECT * FROM time_entries WHERE week_ending_date = ? ORDER BY work_date, line_code'
                async with db.execute(query, (week_ending,)) as cursor:
                    rows = await cursor.fetchall()
            elif start_date and end_date:
                query = 'SELECT * FROM time_entries WHERE work_date >= ? AND work_date <= ? ORDER BY work_date, line_code'
                async with db.execute(query, (start_date, end_date)) as cursor:
                    rows = await cursor.fetchall()
            else:
                raise HTTPException(status_code=400, detail="Must provide week_ending or start_date/end_date")
            
            entries = []
            for row in rows:
                entries.append(TimeEntry(
                    id=row[0],
                    work_date=row[1],
                    week_ending_date=row[2],
                    line_code=row[3],
                    st_hours=row[4],
                    ot_hours=row[5],
                    is_pay_week=bool(row[6]),
                    created_at=row[7],
                    updated_at=row[8]
                ))
            
            return entries
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/entries")
async def create_or_update_entry(entry: TimeEntryCreate):
    """Create or update a time entry"""
    try:
        work_date_obj = datetime.strptime(entry.work_date, '%Y-%m-%d').date()
        week_ending = get_week_ending(work_date_obj)
        
        # Get base pay week from settings
        async with aiosqlite.connect(DB_PATH) as db:
            async with db.execute(
                'SELECT value FROM settings WHERE key = ?',
                ('base_pay_week_ending',)
            ) as cursor:
                row = await cursor.fetchone()
                base_date = datetime.strptime(row[0], '%Y-%m-%d').date() if row else date(2025, 11, 22)
        
        is_pay = is_pay_week(week_ending, base_date)
        week_ending_str = week_ending.strftime('%Y-%m-%d')
        
        async with aiosqlite.connect(DB_PATH) as db:
            # Check if entry exists
            async with db.execute(
                'SELECT id FROM time_entries WHERE work_date = ? AND line_code = ?',
                (entry.work_date, entry.line_code)
            ) as cursor:
                existing = await cursor.fetchone()
            
            if existing:
                # Update existing entry
                await db.execute(
                    '''UPDATE time_entries 
                       SET st_hours = ?, ot_hours = ?, week_ending_date = ?, is_pay_week = ?, updated_at = CURRENT_TIMESTAMP
                       WHERE work_date = ? AND line_code = ?''',
                    (entry.st_hours, entry.ot_hours, week_ending_str, int(is_pay), entry.work_date, entry.line_code)
                )
            else:
                # Insert new entry
                await db.execute(
                    '''INSERT INTO time_entries (work_date, week_ending_date, line_code, st_hours, ot_hours, is_pay_week)
                       VALUES (?, ?, ?, ?, ?, ?)''',
                    (entry.work_date, week_ending_str, entry.line_code, entry.st_hours, entry.ot_hours, int(is_pay))
                )
            
            await db.commit()
            
            # Return the updated entry
            async with db.execute(
                'SELECT * FROM time_entries WHERE work_date = ? AND line_code = ?',
                (entry.work_date, entry.line_code)
            ) as cursor:
                row = await cursor.fetchone()
                return TimeEntry(
                    id=row[0],
                    work_date=row[1],
                    week_ending_date=row[2],
                    line_code=row[3],
                    st_hours=row[4],
                    ot_hours=row[5],
                    is_pay_week=bool(row[6]),
                    created_at=row[7],
                    updated_at=row[8]
                )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/weekly-summary")
async def get_weekly_summary(week_ending: str):
    """Get summary for a specific week"""
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            # Get all entries for the week
            async with db.execute(
                'SELECT * FROM time_entries WHERE week_ending_date = ?',
                (week_ending,)
            ) as cursor:
                rows = await cursor.fetchall()
            
            if not rows:
                # No entries for this week
                week_ending_obj = datetime.strptime(week_ending, '%Y-%m-%d').date()
                async with db.execute(
                    'SELECT value FROM settings WHERE key = ?',
                    ('base_pay_week_ending',)
                ) as cursor:
                    row = await cursor.fetchone()
                    base_date = datetime.strptime(row[0], '%Y-%m-%d').date() if row else date(2025, 11, 22)
                
                is_pay = is_pay_week(week_ending_obj, base_date)
                
                return WeeklySummary(
                    week_ending_date=week_ending,
                    is_pay_week=is_pay,
                    total_st=0,
                    total_ot=0,
                    total_hours=0,
                    lines_used=[],
                    daily_totals={},
                    line_totals={}
                )
            
            total_st = 0
            total_ot = 0
            lines_used = set()
            daily_totals = {}
            line_totals = {}
            
            for row in rows:
                st_hours = row[4]
                ot_hours = row[5]
                line_code = row[3]
                work_date = row[1]
                
                total_st += st_hours
                total_ot += ot_hours
                lines_used.add(line_code)
                
                # Daily totals
                if work_date not in daily_totals:
                    daily_totals[work_date] = {'st': 0, 'ot': 0, 'total': 0}
                daily_totals[work_date]['st'] += st_hours
                daily_totals[work_date]['ot'] += ot_hours
                daily_totals[work_date]['total'] += st_hours + ot_hours
                
                # Line totals
                if line_code not in line_totals:
                    line_totals[line_code] = {'st': 0, 'ot': 0, 'total': 0}
                line_totals[line_code]['st'] += st_hours
                line_totals[line_code]['ot'] += ot_hours
                line_totals[line_code]['total'] += st_hours + ot_hours
            
            is_pay = bool(rows[0][6]) if rows else False
            
            return WeeklySummary(
                week_ending_date=week_ending,
                is_pay_week=is_pay,
                total_st=total_st,
                total_ot=total_ot,
                total_hours=total_st + total_ot,
                lines_used=sorted(list(lines_used)),
                daily_totals=daily_totals,
                line_totals=line_totals
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/lines")
async def get_lines():
    """Get all line codes"""
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            async with db.execute('SELECT * FROM line_codes ORDER BY sort_order') as cursor:
                rows = await cursor.fetchall()
                lines = []
                for row in rows:
                    lines.append(LineCode(
                        line_code=row[0],
                        label=row[1],
                        is_project=bool(row[2]),
                        is_visible=bool(row[3]),
                        sort_order=row[4],
                        created_at=row[5]
                    ))
                return lines
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/lines")
async def create_line(line: LineCodeCreate):
    """Create a new line code (typically for projects)"""
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            # Get max sort order
            async with db.execute('SELECT MAX(sort_order) FROM line_codes') as cursor:
                row = await cursor.fetchone()
                max_sort = row[0] if row[0] else 0
            
            label = line.label if line.label else line.line_code
            
            await db.execute(
                'INSERT INTO line_codes (line_code, label, is_project, is_visible, sort_order) VALUES (?, ?, ?, ?, ?)',
                (line.line_code, label, int(line.is_project), 1, max_sort + 1)
            )
            await db.commit()
            
            async with db.execute(
                'SELECT * FROM line_codes WHERE line_code = ?',
                (line.line_code,)
            ) as cursor:
                row = await cursor.fetchone()
                return LineCode(
                    line_code=row[0],
                    label=row[1],
                    is_project=bool(row[2]),
                    is_visible=bool(row[3]),
                    sort_order=row[4],
                    created_at=row[5]
                )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/lines/{line_code}")
async def update_line(line_code: str, update: LineCodeUpdate):
    """Update line visibility"""
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute(
                'UPDATE line_codes SET is_visible = ? WHERE line_code = ?',
                (int(update.is_visible), line_code)
            )
            await db.commit()
            
            async with db.execute(
                'SELECT * FROM line_codes WHERE line_code = ?',
                (line_code,)
            ) as cursor:
                row = await cursor.fetchone()
                if not row:
                    raise HTTPException(status_code=404, detail="Line code not found")
                return LineCode(
                    line_code=row[0],
                    label=row[1],
                    is_project=bool(row[2]),
                    is_visible=bool(row[3]),
                    sort_order=row[4],
                    created_at=row[5]
                )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/lines/{line_code}")
async def delete_line(line_code: str):
    """Delete a line code (only projects)"""
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            # Check if it's a project line
            async with db.execute(
                'SELECT is_project FROM line_codes WHERE line_code = ?',
                (line_code,)
            ) as cursor:
                row = await cursor.fetchone()
                if not row:
                    raise HTTPException(status_code=404, detail="Line code not found")
                if not row[0]:
                    raise HTTPException(status_code=400, detail="Cannot delete standard line codes")
            
            await db.execute('DELETE FROM line_codes WHERE line_code = ?', (line_code,))
            await db.commit()
            return {"message": "Line code deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/settings")
async def get_settings():
    """Get all settings"""
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            async with db.execute('SELECT * FROM settings') as cursor:
                rows = await cursor.fetchall()
                settings = []
                for row in rows:
                    settings.append(Setting(
                        key=row[0],
                        value=row[1],
                        updated_at=row[2]
                    ))
                return settings
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/settings/{key}")
async def update_setting(key: str, setting: Setting):
    """Update a setting"""
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute(
                'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
                (key, setting.value)
            )
            await db.commit()
            
            async with db.execute(
                'SELECT * FROM settings WHERE key = ?',
                (key,)
            ) as cursor:
                row = await cursor.fetchone()
                return Setting(
                    key=row[0],
                    value=row[1],
                    updated_at=row[2]
                )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/export")
async def export_data(start_date: Optional[str] = None, end_date: Optional[str] = None):
    """Export all data as JSON"""
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            # Get entries
            if start_date and end_date:
                query = 'SELECT * FROM time_entries WHERE work_date >= ? AND work_date <= ?'
                async with db.execute(query, (start_date, end_date)) as cursor:
                    entry_rows = await cursor.fetchall()
            else:
                async with db.execute('SELECT * FROM time_entries') as cursor:
                    entry_rows = await cursor.fetchall()
            
            # Get lines
            async with db.execute('SELECT * FROM line_codes') as cursor:
                line_rows = await cursor.fetchall()
            
            # Get settings
            async with db.execute('SELECT * FROM settings') as cursor:
                setting_rows = await cursor.fetchall()
            
            entries = []
            for row in entry_rows:
                entries.append({
                    'id': row[0],
                    'work_date': row[1],
                    'week_ending_date': row[2],
                    'line_code': row[3],
                    'st_hours': row[4],
                    'ot_hours': row[5],
                    'is_pay_week': bool(row[6]),
                    'created_at': row[7],
                    'updated_at': row[8]
                })
            
            lines = []
            for row in line_rows:
                lines.append({
                    'line_code': row[0],
                    'label': row[1],
                    'is_project': bool(row[2]),
                    'is_visible': bool(row[3]),
                    'sort_order': row[4],
                    'created_at': row[5]
                })
            
            settings = []
            for row in setting_rows:
                settings.append({
                    'key': row[0],
                    'value': row[1],
                    'updated_at': row[2]
                })
            
            return {
                'export_date': datetime.now().isoformat(),
                'entries': entries,
                'line_codes': lines,
                'settings': settings
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/import")
async def import_data(data: dict):
    """Import data from JSON export"""
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            # Import line codes
            if 'line_codes' in data:
                for line in data['line_codes']:
                    await db.execute(
                        '''INSERT OR REPLACE INTO line_codes (line_code, label, is_project, is_visible, sort_order)
                           VALUES (?, ?, ?, ?, ?)''',
                        (line['line_code'], line['label'], int(line['is_project']), 
                         int(line['is_visible']), line['sort_order'])
                    )
            
            # Import settings
            if 'settings' in data:
                for setting in data['settings']:
                    await db.execute(
                        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
                        (setting['key'], setting['value'])
                    )
            
            # Import entries
            if 'entries' in data:
                for entry in data['entries']:
                    await db.execute(
                        '''INSERT OR REPLACE INTO time_entries 
                           (work_date, week_ending_date, line_code, st_hours, ot_hours, is_pay_week)
                           VALUES (?, ?, ?, ?, ?, ?)''',
                        (entry['work_date'], entry['week_ending_date'], entry['line_code'],
                         entry['st_hours'], entry['ot_hours'], int(entry['is_pay_week']))
                    )
            
            await db.commit()
            return {"message": "Data imported successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup():
    await init_db()
    logger.info("Database initialized")

@app.on_event("shutdown")
async def shutdown():
    logger.info("Shutting down")
