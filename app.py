from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
from flask_cors import CORS
from oauth2client.service_account import ServiceAccountCredentials
from flask import Response
from flask import stream_with_context
from requests.exceptions import SSLError
from urllib3.exceptions import ProtocolError
import socket
import gspread
import os
import json
import threading
import time
import requests

app = Flask(__name__)
CORS(app)

# Google Sheets scope
scope = [
    "https://spreadsheets.google.com/feeds",
    "https://www.googleapis.com/auth/drive"
]

# ENV credentials
creds_dict = json.loads(os.environ["GOOGLE_CREDENTIALS"])

creds = ServiceAccountCredentials.from_json_keyfile_dict(
    creds_dict, scope
)

client = gspread.authorize(creds)

pb_progress = {
    "percent": 0,
    "message": "Idle"
}

# =========================================================
# 🔥 SAFE GOOGLE SHEET RETRY
# =========================================================

def safe_sheet_call(func, retries=5, delay=2):

    last_error = None

    for attempt in range(retries):

        try:
            return func()

        except (
            SSLError,
            ProtocolError,
            ConnectionResetError,
            socket.error,
            requests.exceptions.RequestException
        ) as e:

            print(f"🔁 GOOGLE API RETRY {attempt + 1}/{retries}")

            print("ERROR:", str(e))

            last_error = e

            time.sleep(delay)

    raise last_error

# =========================================================
# 🔐 ROLE USERS
# =========================================================

ROLE_USERS = [
    {
        "user": "MASTER",
        "password": "master@11051993"
    },
    {
        "user": "ENGG",
        "password": "engg@225344"
    },
    {
        "user": "ADMIN",
        "password": "admin@221902"
    }
]

# =========================================================
# GOOGLE SHEETS DATABASE FILES
# =========================================================

# 🔥 BUDGET EXPENDITURES
sbgexp_file = client.open_by_key(
    "1d_KdfKp4ZnnmJ_5W_F03RKdlhnScJKQgsUEklss2edY"
)

# 🔥 DG LOG BOOK
dg_file = client.open_by_key(
    "1-9VoQ961MHS7rJf1P5o3ItKH4jsxo4GxNN-oz4ezrn0"
)

# 🔥 DIESEL REGISTER
diesel_file = client.open_by_key(
    "1a-zsw9-AdssijOlyyxxaD-XEDmuSBr9lJHYK9awuKEo"
)

# 🔥 DUTY CHART
duty_file = client.open_by_key(
    "1rphBbU2_2xFeX-Htj1PpYvsZID5kKUcJ6Ho8Kg8Auao"
)

# 🔥 ELECTRICITY REGISTER
eb_file = client.open_by_key(
    "1r9x-S1m9fAuVwB16cVH3E9-jHEIMOCtQrHH24OjopA0"
)

# 🔥 EMPLOYEE DATABASE
emp_file = client.open_by_key(
    "1YAOtydebgF1-XTqJ5ypYDQRK06t5XU7Q5redoGmuow0"
)

# 🔥 PAY BILL
pb_file = client.open_by_key(
    "1EAQcIzUBoG5U-dkOAOaHozwtxFURbW0a4l248-RNL18"
)

# 🔥 REFERENCE DATABASE
ref_file = client.open_by_key(
    "1T8mzTxvyQfVJp5eOAr8w7SZxkY7XbWNw-E4muvgZB1A"
)

# 🔥 SBG DATABASE
sbg_file = client.open_by_key(
    "1VeQApi6T1Rd08uL-oOmulgpfo08NJqs5yL5ec-3REkE"
)

# =========================================================
# WORKSHEETS
# =========================================================

# 🔥 EMPLOYEE
emp_sheet = emp_file.worksheet("EmpDB")

# 🔥 PAY BILL
pb_sheet = pb_file.worksheet("PBDB")

# 🔥 DUTY CHART
duty_sheet = duty_file.worksheet("DutyChart")

# 🔥 SBG
sbg_sheet = sbg_file.worksheet("BudgetDB")

# 🔥 BUDGET EXPENDITURES
sbgexp_sheet = sbgexp_file.worksheet("SBGexpenditure")

# 🔥 DG LOG
dg_sheet = dg_file.worksheet("DGlog")

# 🔥 DIESEL LOG
hsd_sheet = diesel_file.worksheet("HSDlog")

# 🔥 ELECTRICITY LOG
eb_sheet = eb_file.worksheet("EBlog")



# =========================================================
# REFERENCE DATABASE SHEETS
# =========================================================

cpc_sheet = ref_file.worksheet("CPC7DB")

city_sheet = ref_file.worksheet("CityZoneDB")

qtrs_sheet = ref_file.worksheet("QtrsRateDB")

comm_sheet = ref_file.worksheet("CommFactDB")

it_sheet = ref_file.worksheet("ITDB")


# =========================
# API ROUTES
# =========================

def sheet_to_json(sheet):
    data = sheet.get_all_values()

    headers = data[0]   # first row
    rows = data[1:]     # rest rows

    return {
        "headers": headers,
        "rows": rows
    }

@app.route("/emp", methods=["GET"])
def get_emp():
    return jsonify(sheet_to_json(emp_sheet))


@app.route("/sbg", methods=["GET"])
def get_sbg():
    return jsonify(sheet_to_json(sbg_sheet))


@app.route("/sbgexp", methods=["GET"])
def get_sbgexp():
    return jsonify(sheet_to_json(sbgexp_sheet))


@app.route("/pb", methods=["GET"])
def get_pb():
    return jsonify(sheet_to_json(pb_sheet))


@app.route("/cpc", methods=["GET"])
def get_cpc():
    return jsonify(sheet_to_json(cpc_sheet))


@app.route("/city", methods=["GET"])
def get_city():
    return jsonify(sheet_to_json(city_sheet))


@app.route("/qtrs", methods=["GET"])
def get_qtrs():
    return jsonify(sheet_to_json(qtrs_sheet))


@app.route("/comm", methods=["GET"])
def get_comm():
    return jsonify(sheet_to_json(comm_sheet))


@app.route("/it", methods=["GET"])
def get_it():
    return jsonify(sheet_to_json(it_sheet))


@app.route("/dg", methods=["GET"])
def get_dg():
    return jsonify(sheet_to_json(dg_sheet))


@app.route("/hsd", methods=["GET"])
def get_hsd():
    return jsonify(sheet_to_json(hsd_sheet))


@app.route("/eb", methods=["GET"])
def get_eb():
    return jsonify(sheet_to_json(eb_sheet))

@app.route("/duty", methods=["GET"])
def get_duty():
    return jsonify(sheet_to_json(duty_sheet))


# =========================================================
# 🔐 LOGIN API
# =========================================================

@app.route("/login", methods=["POST"])
def login():

    try:

        data = request.get_json()

        station = (
            data.get("station") or ""
        ).strip()

        user = (
            data.get("user") or ""
        ).strip().upper()

        password = (
            data.get("password") or ""
        ).strip()

        # =====================================================
        # 🔥 ROLE LOGIN
        # =====================================================

        role_user = next(

            (
                r for r in ROLE_USERS

                if (
                    r["user"].upper() == user
                    and
                    r["password"] == password
                )
            ),

            None
        )

        if role_user:

            return jsonify({

                "success": True,

                "user": role_user["user"],

                "displayName":
                    role_user["user"],

                "station": station,

                "role":
                    role_user["user"]
            })

        # =====================================================
        # 🔥 NORMAL USER LOGIN
        # =====================================================

        emp_data = emp_sheet.get_all_records()

        found_user = next(

            (
                emp for emp in emp_data

                if (
                    str(
                        emp.get("User", "")
                    ).strip().upper()
                    ==
                    user
                )
            ),

            None
        )

        if not found_user:

            return jsonify({
                "success": False,
                "message": "User not found"
            })

        stored_password = str(
            found_user.get("Password", "")
        ).strip()

        if stored_password != password:

            return jsonify({
                "success": False,
                "message": "Incorrect password"
            })

        return jsonify({

            "success": True,

            "user":
                found_user.get("User", ""),

            "displayName":
                found_user.get(
                    "Employee Name",
                    user
                ),

            "initial":
                found_user.get(
                    "Initial",
                    ""
                ),

            "station": station,

            "role": "USER"
        })

    except Exception as e:

        print(
            "❌ LOGIN ERROR:",
            str(e)
        )

        return jsonify({

            "success": False,

            "message": str(e)

        }), 500


@app.route('/pb/progress')
def pb_progress_stream():

    def generate():

        last_sent = None

        while True:

            try:

                current = json.dumps({
                    **pb_progress,
                    "ts": time.time()
                })

                # ✅ send only if changed
                if current != last_sent:

                    yield f"data: {current}\n\n"

                    last_sent = current

                # ✅ heartbeat
                yield ": keepalive\n\n"

                time.sleep(0.5)

            except GeneratorExit:
                print("🔌 SSE disconnected")
                break

            except Exception as e:
                print("❌ SSE ERROR:", str(e))
                break

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

# =========================
# 🔥 PB UPDATE
# =========================

@app.route("/pb/update", methods=["POST"])
def update_pb():

    try:

        from datetime import datetime

        global pb_progress

        # =========================
        # 🔥 START PROGRESS
        # =========================

        pb_progress["percent"] = 1
        pb_progress["message"] = "Starting..."

        req_data = request.get_json()

        edit_rows = req_data.get("data", [])

        print("🔥 PB UPDATE HIT")
        print("🔥 ROW COUNT:", len(edit_rows))

        if not edit_rows:

            pb_progress["percent"] = 100
            pb_progress["message"] = "No Data"

            return jsonify({
                "status": "error",
                "message": "No data received"
            }), 400

        # =========================
        # 📥 READ SHEET
        # =========================

        pb_progress["percent"] = 5
        pb_progress["message"] = "Reading PB Database..."

        data = safe_sheet_call(
            lambda: pb_sheet.get_all_values()
        )

        headers = data[0]
        rows = data[1:]

        # =========================
        # 🔍 COLUMN INDEXES
        # =========================

        month_idx = headers.index("Salary Month")

        hris_idx = (
            headers.index("HRIS")
            if "HRIS" in headers else -1
        )

        last_updated_idx = (
            headers.index("Last Updated")
            if "Last Updated" in headers else -1
        )

        # =========================
        # 🔧 CLEAN
        # =========================

        def clean(val):
            return str(val or "").strip().lower()

        # =========================
        # 🔥 NORMALIZE
        # =========================

        def normalize(val):

            if val is None:
                return ""

            val = (
                str(val)
                .replace("₹", "")
                .replace(",", "")
                .replace("\r", "")
                .replace("\n", " ")
                .strip()
                .lower()
            )

            if val in ["true", "yes", "checked", "1"]:
                return "true"

            if val in ["false", "no", "0", "unchecked"]:
                return "false"

            if val in ["--", "-"]:
                return ""

            try:
                return f"{float(val):.2f}"
            except:
                return val

        # =========================
        # 🔑 ROW MAP
        # =========================

        pb_progress["percent"] = 10
        pb_progress["message"] = "Preparing Row Map..."

        row_map = {}

        for i, r in enumerate(rows):

            key = f"{clean(r[month_idx])}"

            if hris_idx >= 0:
                key += f"|{clean(r[hris_idx])}"

            row_map[key] = i + 2

        print("🔥 ROW MAP COUNT:", len(row_map))

        # =========================
        # 🔥 TRACKERS
        # =========================

        update_cells = []
        new_rows = []

        updated_employees = []
        added_employees = []

        conflicts = []

        # =========================
        # 🔥 PROGRESS
        # =========================

        total_rows = len(edit_rows)
        processed = 0

        # =========================
        # 🔄 PROCESS ROWS
        # =========================

        for row_obj in edit_rows:

            processed += 1

            progress = int(
                10 + ((processed / total_rows) * 70)
            )

            pb_progress["percent"] = progress

            pb_progress["message"] = (
                f"Saving {processed}/{total_rows} employees"
            )

            # =========================
            # 🔑 BUILD KEY
            # =========================

            key = f"{clean(row_obj.get('Salary Month'))}"

            if hris_idx >= 0:
                key += f"|{clean(row_obj.get('HRIS'))}"

            # =========================
            # 🔄 EXISTING ROW
            # =========================

            if key in row_map:

                row_num = row_map[key]

                existing_row = rows[row_num - 2]

                while len(existing_row) < len(headers):
                    existing_row.append("")

                merged_row = existing_row.copy()

                # =========================
                # 🔥 CONFLICT CHECK
                # =========================

                if last_updated_idx >= 0:

                    sheet_timestamp = (
                        existing_row[last_updated_idx]
                        if last_updated_idx < len(existing_row)
                        else ""
                    )

                    client_timestamp = row_obj.get(
                        "_lastUpdated",
                        ""
                    )

                    if (
                        client_timestamp
                        and sheet_timestamp
                        and client_timestamp != sheet_timestamp
                    ):

                        conflicts.append(
                            row_obj.get(
                                "Employee Name",
                                "Unknown"
                            )
                        )

                        continue

                # =========================
                # 🔥 MERGE
                # =========================

                for col_idx, header in enumerate(headers):

                    if header in row_obj:

                        val = row_obj.get(header, "")

                        # 🔥 KEEP OLD DESIGNATION
                        if (
                            header.strip().lower()
                            ==
                            "designation on salary month"
                        ):

                            if not val:
                                val = merged_row[col_idx]

                        merged_row[col_idx] = val

                # =========================
                # 🔥 ROW CHANGED
                # =========================

                row_changed = False

                ignore_compare = {
                    "Last Updated",
                    "_lastUpdated"
                }

                changed_columns = []

                for i, header in enumerate(headers):

                    if header in ignore_compare:
                        continue

                    old_val = ""

                    if i < len(existing_row):
                        old_val = normalize(existing_row[i])

                    new_val = normalize(merged_row[i])

                    if old_val != new_val:

                        changed_columns.append(header)

                        row_changed = True

                if not row_changed:
                    continue

                # =========================
                # 🔥 TIMESTAMP
                # =========================

                if last_updated_idx >= 0:

                    merged_row[last_updated_idx] = (
                        datetime.now().isoformat()
                    )

                # =========================
                # 🔥 TRACK UPDATE
                # =========================

                updated_employees.append({
                    "employee": row_obj.get(
                        "Employee Name",
                        ""
                    ),
                    "month": row_obj.get(
                        "Salary Month",
                        ""
                    ),
                    "category": row_obj.get(
                        "Category",
                        ""
                    ),
                    "changedColumns": changed_columns
                })

                # =========================
                # 🔥 UPDATE FULL ROW
                # =========================

                row_changed_data = []

                for col_idx, val in enumerate(
                    merged_row,
                    start=1
                ):

                    header = headers[col_idx - 1]

                    if header in [
                        "Last Updated",
                        "_lastUpdated"
                    ]:
                        row_changed_data.append(val)
                        continue

                    old_val = normalize(
                        existing_row[col_idx - 1]
                    )

                    new_val = normalize(val)

                    row_changed_data.append(val)

                # 🔥 UPDATE ENTIRE ROW IN ONE API CALL
                update_cells.append({
                    "range": (
                        f"A{row_num}:"
                        f"{gspread.utils.rowcol_to_a1(row_num, len(headers))[:-len(str(row_num))]}"
                        f"{row_num}"
                    ),
                    "values": [row_changed_data]
                })

            # =========================
            # ➕ NEW ROW
            # =========================

            else:

                new_row = []

                for header in headers:

                    if header == "Last Updated":

                        new_row.append(
                            datetime.now().isoformat()
                        )

                    else:

                        new_row.append(
                            row_obj.get(header, "")
                        )

                new_rows.append(new_row)

                added_employees.append({
                    "employee": row_obj.get(
                        "Employee Name",
                        ""
                    ),
                    "month": row_obj.get(
                        "Salary Month",
                        ""
                    ),
                    "category": row_obj.get(
                        "Category",
                        ""
                    )
                })

        # =========================
        # 🔥 APPLY UPDATES
        # =========================

        pb_progress["percent"] = 85
        pb_progress["message"] = "Updating PB Database..."

        if update_cells:

            safe_sheet_call(
                lambda: pb_sheet.batch_update(
                    update_cells,
                    value_input_option="USER_ENTERED"
                )
            )

        # =========================
        # ➕ APPEND ROWS
        # =========================

        pb_progress["percent"] = 92
        pb_progress["message"] = "Appending New Rows..."

        if new_rows:

            safe_sheet_call(
                lambda: pb_sheet.append_rows(new_rows)
            )

        # =========================
        # ⚠️ CONFLICT
        # =========================

        if conflicts:

            pb_progress["percent"] = 100
            pb_progress["message"] = "Conflict Found"

            return jsonify({
                "status": "conflict",
                "message": (
                    "Some rows modified "
                    "by another user"
                ),
                "employees": conflicts
            })

        # =========================
        # ✅ COMPLETE
        # =========================

        pb_progress["percent"] = 100
        pb_progress["message"] = "Completed"

        return jsonify({
            "status": "success",
            "updatedEmployees":
                updated_employees,
            "addedEmployees":
                added_employees
        })

    except Exception as e:

        pb_progress["percent"] = 100
        pb_progress["message"] = "Error"

        print(
            "❌ PB UPDATE ERROR:",
            str(e)
        )

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@app.route("/sbgexp/update", methods=["POST"])
def update_sbgexp():
    try:
        import re
        from datetime import datetime

        req_data = request.get_json()
        edit_rows = req_data.get("data", [])

        if not edit_rows:
            return jsonify({"status": "error", "message": "No data received"}), 400

        # =========================
        # 🔧 HELPERS
        # =========================
        def clean(val):
            return str(val).strip().lower()

        def normalize_date(val):
            try:
                return datetime.strptime(val.strip(), "%d-%m-%Y").strftime("%Y-%m-%d")
            except:
                return ""

        def clean_details(val):
            if not val:
                return ""
            val = str(val).lower()
            val = re.sub(r"\(.*?\)", "", val)  # remove dynamic part
            return re.sub(r"\s+", " ", val).strip()

        def make_key(row):
            return f"{normalize_date(row.get('Date',''))}|{clean(row.get('Station',''))}|{clean(row.get('SBG Expenditure Under',''))}|{clean_details(row.get('Expenditure Details',''))}"

        # =========================
        # 🔥 CLEAN INPUT (CRITICAL)
        # =========================
        cleaned = []

        for row in edit_rows:
            if not isinstance(row, dict):
                continue

            date = str(row.get("Date", "")).strip()
            station = str(row.get("Station", "")).strip()
            budget = str(row.get("SBG Expenditure Under", "")).strip()

            # ❌ remove header-like rows
            if date.lower() == "date":
                continue

            # ❌ remove blank rows
            if not date or not station or not budget:
                continue

            # ❌ invalid date
            if not normalize_date(date):
                continue

            cleaned.append(row)

        if not cleaned:
            return jsonify({"status": "success", "rows_written": 0})

        # =========================
        # 📥 READ EXISTING (KEEP HEADER SAFE)
        # =========================
        data = sbgexp_sheet.get_all_values()

        if not data:
            return jsonify({"status": "error", "message": "Header missing in sheet"})

        headers = data[0]   # row 1 untouched
        existing_rows = data[1:]

        # =========================
        # 🔥 BUILD EXISTING KEY MAP
        # =========================
        row_map = {}

        for i, r in enumerate(existing_rows):
            existing_row = {
                "Date": r[0],
                "Station": r[1],
                "SBG Expenditure Under": r[3],
                "Expenditure Details": r[4],
            }
            key = make_key(existing_row)
            row_map[key] = i + 2  # actual sheet row

        # =========================
        # 🔄 UPSERT LOGIC
        # =========================
        update_cells = []
        new_rows = []
        seen = set()

        for row in cleaned:

            key = make_key(row)

            if key in seen:
                continue
            seen.add(key)

            values = [row.get(h, "") for h in headers]

            # 🔁 UPDATE EXISTING
            if key in row_map:
                row_num = row_map[key]

                for col_idx, val in enumerate(values):
                    update_cells.append({
                        "range": gspread.utils.rowcol_to_a1(row_num, col_idx + 1),
                        "values": [[val]]
                    })

            # ➕ ADD NEW
            else:
                new_rows.append(values)

        # =========================
        # 🔥 APPLY CHANGES
        # =========================
        if update_cells:
            sbgexp_sheet.batch_update(update_cells)

        if new_rows:
            sbgexp_sheet.append_rows(new_rows)

        return jsonify({
            "status": "success",
            "updated": len(update_cells),
            "added": len(new_rows)
        })

    except Exception as e:
        print("❌ ERROR:", str(e))
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/sbg/bulk-update", methods=["POST"])
def bulk_update_sbg():
    try:
        req = request.get_json()
        rows = req.get("rows", [])

        if not rows:
            return jsonify({"status": "error", "message": "No rows"}), 400

        # 📥 Read existing sheet
        existing_data = sbg_sheet.get_all_values()
        total_cols = len(existing_data[0])

        # ✅ Convert column number → Excel letter (AA, AB...)
        def col_to_letter(n):
            result = ""
            while n > 0:
                n, rem = divmod(n - 1, 26)
                result = chr(65 + rem) + result
            return result

        end_col = col_to_letter(total_cols)
        total_rows = len(rows)

        print("🔥 API HIT")
        print("🔥 Rows received:", total_rows)
        print("🔥 Sample row:", rows[0])

        # ✅ Ensure row length matches sheet
        rows = [r[:total_cols] for r in rows]

        # ✅ Correct range (DATA starts from row 3)
        range_name = f"A3:{end_col}{total_rows + 2}"

        print("📊 Updating Range:", range_name)

        # 🔥 BULK UPDATE
        sbg_sheet.batch_update([{
            "range": range_name,
            "values": rows
        }])

        return jsonify({
            "status": "success",
            "updated_rows": total_rows
        })

    except Exception as e:
        print("❌ ERROR:", str(e))
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

# =========================
# 🔥 SAVE DUTY DATA
# =========================
@app.route("/duty/update", methods=["POST"])
def update_duty():

    try:
        req_data = request.get_json()

        rows = req_data.get("data", [])

        role = (
            req_data.get("role") or ""
        ).upper()

        # 🔥 TOGGLE MODE
        # True  = Duty Mode
        # False = Requirement Mode
        duty_mode = req_data.get(
            "dutyMode",
            False
        )

        if not rows:

            return jsonify({
                "status": "error",
                "message": "No data"
            }), 400

        all_values = duty_sheet.get_all_values()

        headers = all_values[0]

        # =====================================================
        # 🔥 DATE → ROW MAP
        # =====================================================

        date_row_map = {}

        for i, r in enumerate(
            all_values[2:],
            start=3
        ):

            if r and r[0].strip():

                date_row_map[
                    r[0].strip()
                ] = i

        updates = []

        new_rows = []

        # =====================================================
        # 🔥 PROCESS ROWS
        # =====================================================

        for obj in rows:

            date = obj.get("Date")

            if not date:
                continue

            row_data = [None] * len(headers)

            for idx, h in enumerate(headers):

                # =====================================================
                # 🔥 DATE COLUMN
                # =====================================================

                if h == "Date":

                    row_data[idx] = date

                    continue

                val = obj.get(h)

                # =====================================================
                # 🔥 MASTER
                # =====================================================

                if role == "MASTER":

                    # 🔥 DUTY MODE
                    if duty_mode:

                        # ✅ SAVE ONLY DUTY COLUMNS
                        if h.endswith("Duty"):

                            row_data[idx] = (
                                val
                                if val is not None
                                else ""
                            )

                    # 🔥 REQUIREMENT MODE
                    else:

                        # ✅ SAVE REQUIREMENT + LIEU
                        if (
                            "Requirement" in h
                            or "lieu" in h
                        ):

                            row_data[idx] = (
                                val
                                if val is not None
                                else ""
                            )

                # =====================================================
                # 🔥 ENGG
                # =====================================================

                elif role == "ENGG":

                    # ✅ ALWAYS SAVE ONLY DUTY
                    if h.endswith("Duty"):

                        row_data[idx] = (
                            val
                            if val is not None
                            else ""
                        )

                # =====================================================
                # 🔥 USERS / ADMIN
                # =====================================================

                else:

                    # ✅ ALWAYS SAVE REQUIREMENT + LIEU
                    if (
                        "Requirement" in h
                        or "lieu" in h
                    ):

                        row_data[idx] = (
                            val
                            if val is not None
                            else ""
                        )

            # =====================================================
            # 🔥 UPDATE EXISTING ROW
            # =====================================================

            if date in date_row_map:

                row_index = date_row_map[date]

                for col_idx, value in enumerate(
                    row_data,
                    start=1
                ):

                    # 🔥 SKIP UNTOUCHED
                    if value is None:
                        continue

                    updates.append({

                        "range":
                        gspread.utils.rowcol_to_a1(
                            row_index,
                            col_idx
                        ),

                        "values": [[value]]
                    })

            # =====================================================
            # 🔥 NEW ROW
            # =====================================================

            else:

                new_rows.append([
                    v if v is not None else ""
                    for v in row_data
                ])

        # =====================================================
        # 🔥 BATCH UPDATE
        # =====================================================

        if updates:

            duty_sheet.batch_update(
                updates
            )

        # =====================================================
        # 🔥 APPEND NEW ROWS
        # =====================================================

        if new_rows:

            duty_sheet.append_rows(
                new_rows
            )

        return jsonify({
            "status": "success"
        })

    except Exception as e:

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@app.route("/health")
def health():
    return "OK", 200
    # =========================
# RUN SERVER
# =========================
SELF_URL = os.environ.get("SELF_URL", "https://office-management-f425.onrender.com/health")

def self_ping():
    while True:
        try:
            res = requests.get(SELF_URL)
            print(f"[SELF-PING] {res.status_code}")
        except Exception as e:
            print("[SELF-PING ERROR]", e)

        time.sleep(600)  # 10 minutes

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))

    # 🔥 start self-ping thread
    threading.Thread(target=self_ping, daemon=True).start()

    app.run(
        host="0.0.0.0",
        port=port,
        threaded=True,
        debug=False
    )
