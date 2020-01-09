#!/usr/bin/env python3

import json
import os
import sys

import gspread
import oauth2client.service_account


COLUMNS = (
    ("Timestamp", "timestamp"),
    ("Email Address", "rawEmail"),
    ("Your first and last name", "rawName"),
    ("Your major", "rawMajor"),
    ("What will you be doing next year?", "rawPath"),
    ("At what company, school, or organization?", "rawOrg"),
    ("In what city and state?", "rawCityState"),
    ("Do you have separate summer plans you'd like to share?", "rawHasSummerPlans"),
    ("What will you be doing?", "rawSummerPlans"),
    ("At what company, school, or organization?", "rawSummerOrg",),
    ("In what city and state?", "rawSummerCityState"),
    ("Anything else you want to share?", "rawComments"),
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
    ("Summer path", "summerPath"),
    ("Summer organization", "summerOrg"),
    ("Summer organization latitude", "summerOrgLat"),
    ("Summer organization longitude", "summerOrgLong"),
    ("Summer city", "summerCity"),
    ("Summer state", "summerState"),
    ("Summer country", "summerCountry"),
    ("Summer city latitude", "summerCityLat"),
    ("Summer city longitude", "summerCityLong"),
    ("Comments", "comments"),
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
    return gspread.authorize(creds).open("Life After Mudd").get_worksheet(0)


def read_form_responses(worksheet):
    header, *rows = worksheet.get_all_values()
    expected_header = [name for name, _ in COLUMNS]
    if header != expected_header:
        for x, y in zip(expected_header, header):
            if x != y:
                print("expected {}, got {}".format(x, y), file=sys.stderr)
        assert False
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
