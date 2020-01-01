#!/usr/bin/env python3

import json
import os
import sys

import gspread
import oauth2client.service_account


COLUMNS = (
    ("Timestamp", "timestamp"),
    ("Email Address", "email-raw"),
    ("Your name", "name-raw"),
    ("Your major", "major-raw"),
    ("What are you doing?", "path-raw"),
    ("At what company, school, or organization?", "org-raw"),
    ("In what city and state?", "city-state-raw"),
    ("Anything else to say?", "comment-raw"),
    ("", "blank"),
    ("Processed", "processed"),
    ("Email", "email"),
    ("Name", "name"),
    ("Major", "major"),
    ("Path", "path"),
    ("Organization", "org"),
    ("Organization latitude", "org-lat"),
    ("Organization longitude", "org-long"),
    ("City", "city"),
    ("State", "state"),
    ("City latitude", "city-lat"),
    ("City longitude", "city-long"),
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
    with open("responses.json.tmp", "w") as f:
        json.dump(responses, f)
    os.rename("responses.json.tmp", "responses.json")


def upload_form_responses():
    with open("responses.json") as f:
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
