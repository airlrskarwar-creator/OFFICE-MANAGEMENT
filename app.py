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

sbg_progress = {
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
        # ℹ️ NO CHANGES
        # =========================

        if not update_cells and not new_rows:

            pb_progress["percent"] = 100
            pb_progress["message"] = "No Changes"

            return jsonify({
                "status": "nochange",
                "message": "No changes detected",
                "updatedEmployees": [],
                "addedEmployees": []
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


@app.route('/sbg/progress')
def sbg_progress_stream():

    def generate():

        last_sent = None

        while True:

            try:

                current = json.dumps({
                    **sbg_progress,
                    "ts": time.time()
                })

                if current != last_sent:

                    yield f"data: {current}\n\n"

                    last_sent = current

                yield ": keepalive\n\n"

                time.sleep(0.5)

            except GeneratorExit:
                print("🔌 SBG SSE disconnected")
                break

            except Exception as e:
                print("❌ SBG SSE ERROR:", str(e))
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
# 🔥 SBG UPDATE
# =========================

@app.route("/sbgexp/update", methods=["POST"])
def update_sbgexp():

    try:

        from datetime import datetime

        global sbg_progress

        # =====================================================
        # 🔥 START
        # =====================================================

        sbg_progress["percent"] = 1
        sbg_progress["message"] = "Starting..."

        req_data = request.get_json()

        edit_rows = req_data.get("data", [])

        mode = req_data.get("mode", "sync")

        print("🔥 SBG UPDATE HIT")
        print("🔥 MODE:", mode)
        print("🔥 ROW COUNT:", len(edit_rows))

        if not edit_rows:

            sbg_progress["percent"] = 100
            sbg_progress["message"] = "No Data"

            return jsonify({
                "status": "error",
                "message": "No data received"
            }), 400

        # =====================================================
        # 📥 READ SHEET
        # =====================================================

        sbg_progress["percent"] = 5
        sbg_progress["message"] = "Reading SBG Database..."

        data = safe_sheet_call(
            lambda: sbgexp_sheet.get_all_values()
        )

        headers = data[0]
        rows = data[1:]

        # =====================================================
        # 🔍 LAST UPDATED INDEX
        # =====================================================

        last_updated_idx = (
            headers.index("Last Updated")
            if "Last Updated" in headers else -1
        )

        # =====================================================
        # 🔧 NORMALIZE
        # =====================================================

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
                return f"{float(val):.3f}"
            except:
                return val

        # =====================================================
        # 🔥 TRACKERS
        # =====================================================

        update_cells = []

        new_rows = []

        updated_rows = []

        added_rows = []

        conflicts = []

        # =====================================================
        # 🔥 PROGRESS
        # =====================================================

        total_rows = len(edit_rows)
        processed = 0

        # =====================================================
        # 🔄 PROCESS ROWS
        # =====================================================

        for row_obj in edit_rows:

            processed += 1

            progress = int(
                10 + ((processed / total_rows) * 70)
            )

            sbg_progress["percent"] = progress

            sbg_progress["message"] = (
                f"Saving {processed}/{total_rows} rows"
            )

            row_num = row_obj.get("_RowIndex")

            # =====================================================
            # 🔄 SYNC MODE
            # =====================================================

            if mode == "sync":

                matched_row = None

                for idx, existing_row in enumerate(rows):

                    try:

                        while len(existing_row) < len(headers):
                            existing_row.append("")

                        old_date = normalize(existing_row[0])
                        old_station = normalize(existing_row[1])
                        old_bill = normalize(existing_row[2])
                        old_budget = normalize(existing_row[3])
                        old_details = normalize(existing_row[4])

                        new_date = normalize(
                            row_obj.get("Date", "")
                        )

                        new_station = normalize(
                            row_obj.get("Station", "")
                        )

                        new_bill = normalize(
                            row_obj.get(
                                "Bill / Invoice Details",
                                ""
                            )
                        )

                        new_budget = normalize(
                            row_obj.get(
                                "SBG Expenditure Under",
                                ""
                            )
                        )

                        new_details = normalize(
                            row_obj.get(
                                "Expenditure Details",
                                ""
                            )
                        )

                        # =====================================================
                        # 🔥 MATCH EXISTING ROW
                        # =====================================================

                        if (
                            old_date == new_date and
                            old_station == new_station and
                            old_bill == new_bill and
                            old_budget == new_budget and
                            old_details == new_details
                        ):

                            matched_row = idx + 2
                            break

                    except:
                        pass

                # =====================================================
                # 🔄 UPDATE EXISTING
                # =====================================================

                if matched_row:

                    existing_row = rows[matched_row - 2]

                    while len(existing_row) < len(headers):
                        existing_row.append("")

                    merged_row = existing_row.copy()

                    for col_idx, header in enumerate(headers):

                        if header in row_obj:

                            merged_row[col_idx] = row_obj.get(
                                header,
                                ""
                            )

                    row_changed = False

                    changed_columns = []

                    for i, header in enumerate(headers):

                        if header == "Last Updated":
                            continue

                        old_val = normalize(
                            existing_row[i]
                            if i < len(existing_row)
                            else ""
                        )

                        new_val = normalize(
                            merged_row[i]
                        )

                        if old_val != new_val:

                            row_changed = True

                            changed_columns.append(header)

                    # ⏭ SKIP NO CHANGE
                    if not row_changed:
                        continue

                    # 🔥 UPDATE TIMESTAMP
                    if last_updated_idx >= 0:

                        merged_row[last_updated_idx] = (
                            datetime.now().isoformat()
                        )

                    update_cells.append({

                        "range":
                            f"A{matched_row}:"
                            f"{gspread.utils.rowcol_to_a1(matched_row, len(headers))[:-len(str(matched_row))]}"
                            f"{matched_row}",

                        "values": [merged_row]
                    })

                    updated_rows.append({
                        "date": row_obj.get(
                            "Date",
                            ""
                        ),
                        "station": row_obj.get(
                            "Station",
                            ""
                        ),
                        "budget": row_obj.get(
                            "SBG Expenditure Under",
                            ""
                        ),
                        "amount": row_obj.get(
                            "Expenditure Amount (₹ in 000)",
                            ""
                        ),

                        "monthlyCumulative": row_obj.get(
                            "Monthly Cumulative Sum of Expenditure (₹ in 000)",
                            ""
                        ),

                        "cumulative": row_obj.get(
                            "Cumulative Sum of Expenditure (₹ in 000)",
                            ""
                        ),
                        "changedColumns":
                            changed_columns
                    })

                # =====================================================
                # ➕ ADD NEW
                # =====================================================

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

                    added_rows.append({
                        "date": row_obj.get(
                            "Date",
                            ""
                        ),
                        "station": row_obj.get(
                            "Station",
                            ""
                        ),
                        "budget": row_obj.get(
                            "SBG Expenditure Under",
                            ""
                        ),
                        "amount": row_obj.get(
                            "Expenditure Amount (₹ in 000)",
                            ""
                        ),

                        "monthlyCumulative": row_obj.get(
                            "Monthly Cumulative Sum of Expenditure (₹ in 000)",
                            ""
                        ),

                        "cumulative": row_obj.get(
                            "Cumulative Sum of Expenditure (₹ in 000)",
                            ""
                        )
                    })

                continue

            # =====================================================
            # 🔄 EDIT MODE
            # =====================================================

            if mode == "edit" and row_num:

                try:

                    row_num = int(row_num)

                    existing_row = rows[row_num - 2]

                    while len(existing_row) < len(headers):
                        existing_row.append("")

                    merged_row = existing_row.copy()

                    # =====================================================
                    # ⚠️ CONFLICT CHECK
                    # =====================================================

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
                            and
                            sheet_timestamp
                            and
                            client_timestamp != sheet_timestamp
                        ):

                            conflicts.append({
                                "row": row_num,
                                "station": row_obj.get(
                                    "Station",
                                    ""
                                )
                            })

                            continue

                    # =====================================================
                    # 🔥 MERGE NEW VALUES
                    # =====================================================

                    for col_idx, header in enumerate(headers):

                        if header in row_obj:

                            merged_row[col_idx] = row_obj.get(
                                header,
                                ""
                            )

                    # =====================================================
                    # 🔥 CHANGE DETECTION
                    # =====================================================

                    changed_columns = []

                    row_changed = False

                    ignore_compare = {
                        "Last Updated",
                        "_lastUpdated"
                    }

                    for i, header in enumerate(headers):

                        if header in ignore_compare:
                            continue

                        old_val = normalize(
                            existing_row[i]
                            if i < len(existing_row)
                            else ""
                        )

                        new_val = normalize(
                            merged_row[i]
                        )

                        if old_val != new_val:

                            changed_columns.append(header)

                            row_changed = True

                    # ⏭ SKIP NO CHANGE
                    if not row_changed:
                        continue

                    # 🔥 UPDATE TIMESTAMP
                    if last_updated_idx >= 0:

                        merged_row[last_updated_idx] = (
                            datetime.now().isoformat()
                        )

                    # 🔥 TRACK UPDATED ROW
                    updated_rows.append({

                        "date": row_obj.get(
                            "Date",
                            ""
                        ),

                        "station": row_obj.get(
                            "Station",
                            ""
                        ),

                        "budget": row_obj.get(
                            "SBG Expenditure Under",
                            ""
                        ),

                        "amount": row_obj.get(
                            "Expenditure Amount (₹ in 000)",
                            ""
                        ),

                        "monthlyCumulative": row_obj.get(
                            "Monthly Cumulative Sum of Expenditure (₹ in 000)",
                            ""
                        ),

                        "cumulative": row_obj.get(
                            "Cumulative Sum of Expenditure (₹ in 000)",
                            ""
                        ),

                        "changedColumns":
                            changed_columns
                    })

                    # 🔥 UPDATE SAME ROW
                    update_cells.append({

                        "range":
                            f"A{row_num}:"
                            f"{gspread.utils.rowcol_to_a1(row_num, len(headers))[:-len(str(row_num))]}"
                            f"{row_num}",

                        "values": [merged_row]
                    })

                except Exception as inner_err:

                    print(
                        "❌ ROW UPDATE ERROR:",
                        str(inner_err)
                    )

            # =====================================================
            # ➕ ADD MODE
            # =====================================================

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

                added_rows.append({

                    "date": row_obj.get(
                        "Date",
                        ""
                    ),

                    "station": row_obj.get(
                        "Station",
                        ""
                    ),

                    "budget": row_obj.get(
                        "SBG Expenditure Under",
                        ""
                    ),

                    "amount": row_obj.get(
                        "Expenditure Amount (₹ in 000)",
                        ""
                    ),

                    "monthlyCumulative": row_obj.get(
                        "Monthly Cumulative Sum of Expenditure (₹ in 000)",
                        ""
                    ),

                    "cumulative": row_obj.get(
                        "Cumulative Sum of Expenditure (₹ in 000)",
                        ""
                    )
                })

        # =====================================================
        # ℹ️ NO CHANGES
        # =====================================================

        if not update_cells and not new_rows:

            sbg_progress["percent"] = 100
            sbg_progress["message"] = "No Changes"

            return jsonify({
                "status": "nochange",
                "message": "No changes detected",
                "updatedRows": [],
                "addedRows": []
            })


        # =====================================================
        # 🔥 APPLY UPDATES
        # =====================================================

        sbg_progress["percent"] = 85
        sbg_progress["message"] = "Updating SBG Database..."

        if update_cells:

            safe_sheet_call(
                lambda: sbgexp_sheet.batch_update(
                    update_cells,
                    value_input_option="USER_ENTERED"
                )
            )

        # =====================================================
        # ➕ APPEND NEW
        # =====================================================

        sbg_progress["percent"] = 92
        sbg_progress["message"] = "Appending New Rows..."

        if new_rows:

            safe_sheet_call(
                lambda: sbgexp_sheet.append_rows(
                    new_rows
                )
            )

        # =====================================================
        # 🔥 SORT MONTHWISE + DATEWISE
        # =====================================================

        try:

            sbg_progress["percent"] = 96
            sbg_progress["message"] = (
                "Organizing SBG Database..."
            )

            latest_data = safe_sheet_call(
                lambda: sbgexp_sheet.get_all_values()
            )

            if latest_data and len(latest_data) > 1:

                headers = latest_data[0]

                body = latest_data[1:]

                # =====================================================
                # 🔥 DATE PARSER
                # =====================================================

                def parse_date(val):

                    try:

                        return datetime.strptime(
                            str(val).strip(),
                            "%d-%m-%Y"
                        )

                    except:

                        return datetime.min

                # =====================================================
                # 🔥 ORIGINAL ORDER
                # =====================================================

                original_body = body.copy()

                # =====================================================
                # 🔥 SORTED COPY
                # =====================================================

                sorted_body = sorted(

                    body,

                    key=lambda r: (

                        # 🔥 DATE
                        parse_date(
                            r[0]
                            if len(r) > 0 else ""
                        ),

                        # 🔥 STATION
                        normalize(
                            r[1]
                            if len(r) > 1 else ""
                        ),

                        # 🔥 BUDGET
                        normalize(
                            r[3]
                            if len(r) > 3 else ""
                        )
                    )
                )

                # =====================================================
                # ℹ️ ALREADY SORTED
                # =====================================================

                if original_body != sorted_body:

                    safe_sheet_call(
                        lambda: sbgexp_sheet.update(
                            [headers] + sorted_body,
                            value_input_option="USER_ENTERED"
                        )
                    )

                    print(
                        "✅ SBG DATABASE SORTED"
                    )

                else:

                    print(
                        "ℹ️ SBG already sorted"
                    )

        except Exception as sort_err:

            print(
                "❌ SBG SORT ERROR:",
                str(sort_err)
            )


        # =====================================================
        # ⚠️ CONFLICT
        # =====================================================

        if conflicts:

            sbg_progress["percent"] = 100
            sbg_progress["message"] = "Conflict Found"

            return jsonify({
                "status": "conflict",
                "message": (
                    "Some rows modified "
                    "by another user"
                ),
                "rows": conflicts
            })

        # =====================================================
        # ✅ COMPLETE
        # =====================================================

        sbg_progress["percent"] = 100
        sbg_progress["message"] = "Completed"

        return jsonify({

            "status": "success",

            "updatedRows":
                updated_rows,

            "addedRows":
                added_rows
        })

    except Exception as e:

        sbg_progress["percent"] = 100
        sbg_progress["message"] = "Error"

        print(
            "❌ SBG UPDATE ERROR:",
            str(e)
        )

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


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


# =========================================
# 🔥 UPDATE EB DATA
# =========================================

@app.route("/eb/update", methods=["POST"])
def update_eb():

    try:

        req_data = request.get_json()

        rows = req_data.get("data", [])

        print("🔥 EB UPDATE HIT")
        print("🔥 ROW COUNT:", len(rows))

        if not rows:
            return jsonify({
                "status": "error",
                "message": "No data received"
            }), 400

        # =========================================
        # 🔥 READ SHEET
        # =========================================

        all_values = eb_sheet.get_all_values()

        if not all_values:
            return jsonify({
                "status": "error",
                "message": "Sheet empty"
            }), 400

        headers = all_values[0]
        data_rows = all_values[1:]

        # =========================================
        # 🔥 COLUMN INDEXES
        # =========================================

        month_idx = headers.index("Month-Year") if "Month-Year" in headers else -1
        station_idx = headers.index("EB Station") if "EB Station" in headers else -1

        # =========================================
        # 🔥 CLEAN FUNCTION
        # =========================================

        def clean(val):
            return str(val or "").strip().lower()

        # =========================================
        # 🔥 BUILD EXISTING ROW MAP
        # =========================================

        row_map = {}

        for i, row in enumerate(data_rows, start=2):

            key = ""

            if month_idx >= 0:
                key += clean(row[month_idx] if month_idx < len(row) else "")

            if station_idx >= 0:
                key += "|" + clean(row[station_idx] if station_idx < len(row) else "")

            row_map[key] = {
                "row_num": i,
                "row_data": row
            }

        print("🔥 EXISTING ROWS:", len(row_map))

        # =========================================
        # 🔥 TRACKERS
        # =========================================

        updates = []
        new_rows = []
        updated_rows = []
        added_rows = []
        skipped_rows = []

        # =========================================
        # 🔥 PROCESS ROWS
        # =========================================

        for obj in rows:

            key = ""

            if month_idx >= 0:
                key += clean(obj.get("Month-Year"))

            if station_idx >= 0:
                key += "|" + clean(obj.get("EB Station"))

            row_data = [obj.get(h, "") for h in headers]

            # =====================================
            # 🔥 UPDATE EXISTING
            # =====================================

            if key in row_map:

                existing = row_map[key]

                row_num = existing["row_num"]

                existing_row = existing["row_data"]

                existing_clean = [clean(x) for x in existing_row]
                new_clean = [clean(x) for x in row_data]

                # =================================
                # ⏭ NO CHANGE
                # =================================

                if existing_clean == new_clean:

                    skipped_rows.append({
                        "month": obj.get("Month-Year", ""),
                        "station": obj.get("EB Station", "")
                    })

                    print("⏭ SKIPPED:", key)

                    continue

                # =================================
                # 🔥 CHANGED COLUMNS
                # =================================

                changed_columns = []

                for idx, header in enumerate(headers):

                    old_val = clean(existing_row[idx]) if idx < len(existing_row) else ""
                    new_val = clean(row_data[idx])

                    if old_val != new_val:
                        changed_columns.append(header)

                # =================================
                # 🔥 UPDATE
                # =================================

                updates.append({
                    "range": f"A{row_num}",
                    "values": [row_data]
                })

                updated_rows.append({
                    "month": obj.get("Month-Year", ""),
                    "station": obj.get("EB Station", ""),
                    "reference": obj.get("Reference", ""),
                    "finalAmount": obj.get("Final Amount", 0),
                    "changedColumns": changed_columns
                })

            # =====================================
            # ➕ NEW ROW
            # =====================================

            else:

                new_rows.append(row_data)

                added_rows.append({
                    "month": obj.get("Month-Year", ""),
                    "station": obj.get("EB Station", ""),
                    "reference": obj.get("Reference", ""),
                    "finalAmount": obj.get("Final Amount", 0)
                })

        # =========================================
        # 🔥 APPLY UPDATES
        # =========================================

        if updates:

            eb_sheet.batch_update(
                updates,
                value_input_option="USER_ENTERED"
            )

            print("✅ UPDATED:", len(updates))

        # =========================================
        # ➕ APPEND NEW ROWS
        # =========================================

        if new_rows:

            eb_sheet.append_rows(
                new_rows,
                value_input_option="USER_ENTERED"
            )

            print("✅ ADDED:", len(new_rows))

        # =========================================
        # 🔥 SORT MONTHWISE ONLY
        # =========================================

        try:

            latest_data = eb_sheet.get_all_values()

            if latest_data and len(latest_data) > 1:

                headers = latest_data[0]

                body = latest_data[1:]

                # =====================================
                # 🔥 MONTH PARSER
                # =====================================

                def parse_month(val):

                    try:

                        return datetime.strptime(
                            str(val).strip(),
                            "%b-%Y"
                        )

                    except:

                        return datetime.min

                # =====================================
                # 🔥 ORIGINAL ORDER
                # =====================================

                original_body = body.copy()

                # =====================================
                # 🔥 SORTED COPY
                # =====================================

                sorted_body = sorted(

                    body,

                    key=lambda r:

                        parse_month(
                            r[month_idx]
                            if month_idx >= 0 and month_idx < len(r)
                            else ""
                        )
                )

                # =====================================
                # ℹ️ ALREADY SORTED
                # =====================================

                if original_body != sorted_body:

                    eb_sheet.update(
                        [headers] + sorted_body,
                        value_input_option="USER_ENTERED"
                    )

                    print(
                        "✅ EB DATABASE SORTED"
                    )

                else:

                    print(
                        "ℹ️ EB already sorted"
                    )

        except Exception as sort_err:

            print(
                "❌ EB SORT ERROR:",
                str(sort_err)
            )

        # =========================================
        # ℹ️ NO CHANGES
        # =========================================

        if not updates and not new_rows:

            return jsonify({
                "status": "nochange",
                "message": "No changes detected",
                "updated": [],
                "added": [],
                "skipped": skipped_rows
            })

        # =========================================
        # ✅ SUCCESS
        # =========================================

        return jsonify({
            "status": "success",
            "updated": updated_rows,
            "added": added_rows,
            "skipped": skipped_rows
        })

    except Exception as e:

        print("❌ EB UPDATE ERROR:", str(e))

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


# =========================================
# 🔥 UPDATE DG DATA
# =========================================

@app.route("/dg/update", methods=["POST"])
def update_dg():

    try:

        req_data = request.get_json()

        rows = req_data.get("data", [])

        print("🔥 DG UPDATE HIT")
        print("🔥 ROW COUNT:", len(rows))

        if not rows:
            return jsonify({
                "status": "error",
                "message": "No data received"
            }), 400

        # =========================================
        # 🔥 READ SHEET
        # =========================================

        all_values = dg_sheet.get_all_values()

        if not all_values:
            return jsonify({
                "status": "error",
                "message": "Sheet empty"
            }), 400

        headers = all_values[0]

        data_rows = all_values[1:]

        # =========================================
        # 🔥 DURATION COLUMNS
        # =========================================

        duration_cols = {
            "Total Duration",
            "Progressive Test",
            "Progressive Failure",
            "Total Progressive"
        }

        # =========================================
        # 🔥 COLUMN INDEXES
        # =========================================

        entry_idx = headers.index("Entry ID") \
            if "Entry ID" in headers else -1

        # =========================================
        # 🔥 CLEAN
        # =========================================

        def clean(val):
            return str(val or "").strip().lower()

        # =========================================
        # 🔥 BUILD ROW MAP
        # KEY = ENTRY ID
        # =========================================

        row_map = {}

        for i, row in enumerate(data_rows, start=2):

            if entry_idx < 0:
                continue

            entry_id = clean(
                row[entry_idx]
                if entry_idx < len(row)
                else ""
            )

            if entry_id:
                row_map[entry_id] = {
                    "row_num": i,
                    "row_data": row
                }

        print("🔥 EXISTING ROWS:", len(row_map))

        # =========================================
        # 🔥 TRACKERS
        # =========================================

        updates = []

        new_rows = []

        updated_rows = []

        added_rows = []

        skipped_rows = []

        # =========================================
        # 🔥 PROCESS ROWS
        # =========================================

        for obj in rows:

            entry_id = clean(obj.get("Entry ID"))

            # =====================================
            # 🔥 BUILD ROW DATA
            # =====================================

            row_data = []

            for h in headers:

                val = obj.get(h, "")

                # =================================
                # 🔥 KEEP FORMULAS
                # =================================

                if h in duration_cols or h == "Sr No":
                    val = str(val)

                row_data.append(val)

            # =====================================
            # 🔥 UPDATE EXISTING
            # =====================================

            if entry_id in row_map:

                existing = row_map[entry_id]

                row_num = existing["row_num"]

                existing_row = existing["row_data"]

                existing_clean = [
                    clean(x)
                    for x in existing_row
                ]

                new_clean = [
                    clean(x)
                    for x in row_data
                ]

                # =================================
                # ⏭ NO CHANGE
                # =================================

                if existing_clean == new_clean:

                    skipped_rows.append({
                        "entryId": entry_id,
                        "date": obj.get("Date", ""),
                        "station": obj.get("Station", "")
                    })

                    print("⏭ SKIPPED:", entry_id)

                    continue

                # =================================
                # 🔥 CHANGED COLUMNS
                # =================================

                changed_columns = []

                for idx, header in enumerate(headers):

                    old_val = clean(
                        existing_row[idx]
                    ) if idx < len(existing_row) else ""

                    new_val = clean(row_data[idx])

                    if old_val != new_val:
                        changed_columns.append(header)

                # =================================
                # 🔥 UPDATE
                # =================================

                updates.append({
                    "range": f"A{row_num}",
                    "values": [row_data]
                })

                updated_rows.append({
                    "entryId": entry_id,
                    "date": obj.get("Date", ""),
                    "station": obj.get("Station", ""),
                    "dgName": obj.get("DG Name", ""),
                    "changedColumns": changed_columns
                })

            # =====================================
            # ➕ NEW ROW
            # =====================================

            else:

                new_rows.append(row_data)

                added_rows.append({
                    "entryId": entry_id,
                    "date": obj.get("Date", ""),
                    "station": obj.get("Station", ""),
                    "dgName": obj.get("DG Name", "")
                })

        # =========================================
        # 🔥 APPLY UPDATES
        # =========================================

        if updates:

            dg_sheet.batch_update(
                updates,
                value_input_option="USER_ENTERED"
            )

            print("✅ UPDATED:", len(updates))

        # =========================================
        # ➕ APPEND NEW ROWS
        # =========================================

        if new_rows:

            dg_sheet.append_rows(
                new_rows,
                value_input_option="USER_ENTERED"
            )

            print("✅ ADDED:", len(new_rows))

        # =========================================
        # ℹ️ NO CHANGES
        # =========================================

        if not updates and not new_rows:

            return jsonify({
                "status": "nochange",
                "message": "No changes detected",
                "updated": [],
                "added": [],
                "skipped": skipped_rows
            })

        # =========================================
        # ✅ SUCCESS
        # =========================================

        return jsonify({
            "status": "success",
            "updated": updated_rows,
            "added": added_rows,
            "skipped": skipped_rows
        })

    except Exception as e:

        print("❌ DG UPDATE ERROR:", str(e))

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
