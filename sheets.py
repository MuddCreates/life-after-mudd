#!/usr/bin/env python3

import json
import os
import sys

import gspread
import oauth2client.service_account


COLUMNS = (
    ("Timestamp", "timestamp"),
    ("Email Address", "emailRaw"),
    ("Your name", "nameRaw"),
    ("Your major", "majorRaw"),
    ("What are you doing?", "pathRaw"),
    ("At what company, school, or organization?", "orgRaw"),
    ("In what city and state?", "cityStateRaw"),
    ("Anything else to say?", "commentRaw"),
    ("", "blank"),
    ("Processed", "processed"),
    ("Email", "email"),
    ("Name", "name"),
    ("Major", "major"),
    ("Path", "path"),
    ("Organization", "org"),
    ("Organization latitude", "orgLat"),
    ("Organization longitude", "orgLong"),
    ("City", "city"),
    ("State", "state"),
    ("Country", "country"),
    ("City latitude", "cityLat"),
    ("City longitude", "cityLong"),
)


COLUMN_INDICES = {key: idx for idx, (_, key) in enumerate(COLUMNS)}


def get_worksheet():
    creds = oauth2client.service_account.ServiceAccountCredentials.from_json_keyfile_name(
        ".oauth-private-key.json",
        # https://gspread.readthedocs.io/en/latest/oauth2.html#using-signed-credentials
        [
            "https://spreadsheets.google.com/feeds",
            "https://www.googleapis.com/auth/drive",
        ],
    )
    return gspread.authorize(creds).open("Life after Mudd").get_worksheet(0)


def read_form_responses(worksheet):
    header, *rows = worksheet.get_all_values()
    assert header == [name for name, _ in COLUMNS], header
    return [{key: value for (_, key), value in zip(COLUMNS, row)} for row in rows]


def write_form_responses(worksheet, responses):
    header = worksheet.row_values(1)
    assert header == [name for name, _ in COLUMNS], header
    cells = worksheet.range(
        2, COLUMN_INDICES["blank"] + 2, len(responses) + 1, len(COLUMNS)
    )
    for cell in cells:
        cell.value = responses[cell.row - 2][COLUMNS[cell.col - 1][1]]
    worksheet.update_cells(cells)


def download_form_responses():
    worksheet = get_worksheet()
    responses = read_form_responses(worksheet)
    with open("data-admin.json.tmp", "w") as f:
        json.dump(responses, f)
    os.rename("data-admin.json.tmp", "data-admin.json")


def upload_form_responses():
    with open("data-admin.json") as f:
        responses = json.load(f)
    worksheet = get_worksheet()
    write_form_responses(worksheet, responses)


if __name__ == "__main__":
    if sys.argv[1] == "download":
        download_form_responses()
    elif sys.argv[1] == "upload":
        upload_form_responses()
    else:
        print("no such operation", file=sys.stderr)
        sys.exit(1)
