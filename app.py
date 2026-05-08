from flask import Flask, request, jsonify
from datetime import datetime
from flask_cors import CORS
from oauth2client.service_account import ServiceAccountCredentials
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
sbgexp_sheet = sbgexp_file.worksheet("SBGexpenditureDB")

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



@app.route("/pb/update", methods=["POST"])
def update_pb():

    try:
        from datetime import datetime

        req_data = request.get_json()

        edit_rows = req_data.get("data", [])

        if not edit_rows:
            return jsonify({
                "status": "error",
                "message": "No data received"
            }), 400

        # =========================
        # 📥 READ SHEET
        # =========================
        data = pb_sheet.get_all_values()

        headers = data[0]
        rows = data[1:]

        # =========================
        # 🔍 COLUMN INDEXES
        # =========================
        month_idx = headers.index("Salary Month")
        emp_idx = headers.index("Employee Name")

        hris_idx = (
            headers.index("HRIS")
            if "HRIS" in headers else -1
        )

        category_idx = (
            headers.index("Category")
            if "Category" in headers else -1
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
        # 🔑 ROW MAP
        # =========================
        row_map = {}

        for i, r in enumerate(rows):

            key = f"{clean(r[month_idx])}"

            if hris_idx >= 0:
                key += f"|{clean(r[hris_idx])}"

            if category_idx >= 0:
                key += f"|{clean(r[category_idx])}"

            row_map[key] = i + 2

        # =========================
        # 🔥 TRACKERS
        # =========================
        update_cells = []
        new_rows = []

        updated_employees = []
        added_employees = []

        conflicts = []

        # =========================
        # 🔄 PROCESS ROWS
        # =========================
        for row_obj in edit_rows:

            # =========================
            # 🔑 BUILD KEY
            # =========================
            key = f"{clean(row_obj.get('Salary Month'))}"

            if hris_idx >= 0:
                key += f"|{clean(row_obj.get('HRIS'))}"

            if category_idx >= 0:
                key += f"|{clean(row_obj.get('Category'))}"

            # =========================
            # 🔄 EXISTING ROW
            # =========================
            if key in row_map:

                row_num = row_map[key]

                existing_row = rows[row_num - 2]

                # =========================
                # 🔥 ENSURE SAFE LENGTH
                # =========================
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
                # 🔥 MERGE ONLY SENT FIELDS
                # =========================
                for col_idx, header in enumerate(headers):

                    if header in row_obj:

                        val = row_obj.get(header, "")

                        # 🔥 Preserve designation
                        if (
                            header.strip().lower()
                            ==
                            "designation on salary month"
                        ):

                            if not val:
                                val = merged_row[col_idx]

                        merged_row[col_idx] = val

                # =========================
                # 🔥 CHECK ROW CHANGED
                # =========================
                row_changed = False

                ignore_compare = {
                    "Last Updated",
                    "_lastUpdated"
                }

                for i, header in enumerate(headers):

                    # 🔥 Ignore timestamp fields
                    if header in ignore_compare:
                        continue

                    old_val = ""

                    if i < len(existing_row):
                        old_val = str(
                            existing_row[i]
                        ).strip()

                    new_val = str(
                        merged_row[i]
                    ).strip()

                    if old_val != new_val:

                        row_changed = True
                        break

                # ❌ Skip if no changes
                if not row_changed:
                    continue

                # =========================
                # 🔥 UPDATE TIMESTAMP
                # =========================
                if last_updated_idx >= 0:

                    merged_row[last_updated_idx] = (
                        datetime.now().isoformat()
                    )

                # =========================
                # 🔥 TRACK UPDATED EMPLOYEE
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
                    )
                })

                # =========================
                # 🔥 UPDATE ONLY CHANGED CELLS
                # =========================
                for col_idx, val in enumerate(
                    merged_row,
                    start=1
                ):

                    header = headers[col_idx - 1]

                    # 🔥 Ignore timestamp compare
                    if header in ["Last Updated", "_lastUpdated"]:
                        continue

                    old_val = str(
                        existing_row[col_idx - 1]
                    ).strip()

                    new_val = str(val).strip()

                    # ❌ Skip unchanged cell
                    if old_val == new_val:
                        continue

                    update_cells.append({
                        "range": (
                            gspread.utils.rowcol_to_a1(
                                row_num,
                                col_idx
                            )
                        ),
                        "values": [[val]]
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

                # =========================
                # 🔥 TRACK ADDED EMPLOYEE
                # =========================
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
        # 🔥 REMOVE DUPLICATES
        # =========================
        updated_employees = list({
            (
                x["employee"],
                x["month"],
                x["category"]
            ): x
            for x in updated_employees
        }.values())

        added_employees = list({
            (
                x["employee"],
                x["month"],
                x["category"]
            ): x
            for x in added_employees
        }.values())

        # =========================
        # 🔥 APPLY UPDATES
        # =========================
        if update_cells:

            pb_sheet.batch_update(update_cells)

        # =========================
        # ➕ APPEND NEW ROWS
        # =========================
        if new_rows:

            pb_sheet.append_rows(new_rows)

        # =========================
        # ⚠️ CONFLICT RESPONSE
        # =========================
        if conflicts:

            return jsonify({
                "status": "conflict",
                "message": (
                    "Some rows modified "
                    "by another user"
                ),
                "employees": conflicts
            })

        # =========================
        # ✅ SUCCESS
        # =========================
        return jsonify({
            "status": "success",

            "updatedEmployees":
                updated_employees,

            "addedEmployees":
                added_employees
        })

    except Exception as e:

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

    app.run(host="0.0.0.0", port=port)
