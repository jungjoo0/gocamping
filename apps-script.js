const SPREADSHEET_ID = "1ZynYR9WBvhZ4kG0FmEWDKpFgl8C6XehxO70XhOSWqzU";
const SHEET_NAME = "items";
const HEADERS = [
  "id",
  "family",
  "itemName",
  "quantity",
  "selectedFamily",
  "createdAt",
  "updatedAt",
  "deleted"
];

function doGet(e) {
  const callback = e.parameter.callback || "callback";
  const action = e.parameter.action || "listItems";
  const payload = parsePayload(e.parameter.payload);
  const result = handleAction(action, payload);
  return jsonp(callback, result);
}

function doPost(e) {
  const body = parsePayload(e.postData && e.postData.contents);
  return json({
    ok: true,
    data: handleAction(body.action, body.payload || {})
  });
}

function handleAction(action, payload) {
  try {
    if (action === "listItems") {
      return ok(listItems());
    }
    if (action === "createItem") {
      return ok(createItem(payload));
    }
    if (action === "updateItem") {
      return ok(updateItem(payload));
    }
    if (action === "deleteItem") {
      return ok(deleteItem(payload));
    }
    if (action === "chooseFamily") {
      return ok(chooseFamily(payload));
    }
    throw new Error("Unknown action: " + action);
  } catch (error) {
    return {
      ok: false,
      error: error.message
    };
  }
}

function listItems() {
  const sheet = getSheet();
  const values = sheet.getDataRange().getValues();
  const rows = values.slice(1);
  return rows
    .map(rowToItem)
    .filter(function(item) {
      return item.id && item.deleted !== true && item.deleted !== "TRUE";
    });
}

function createItem(payload) {
  validateItemPayload(payload);
  const sheet = getSheet();
  const now = new Date().toISOString();
  const item = {
    id: Utilities.getUuid(),
    family: payload.family,
    itemName: String(payload.itemName).trim(),
    quantity: Number(payload.quantity || 1),
    selectedFamily: "",
    createdAt: now,
    updatedAt: now,
    deleted: false
  };
  sheet.appendRow(itemToRow(item));
  return item;
}

function updateItem(payload) {
  if (!payload.id) {
    throw new Error("id is required");
  }
  validateItemPayload(payload, true);

  const sheet = getSheet();
  const data = getRowsWithIndex(sheet);
  const target = data.find(function(entry) {
    return entry.item.id === payload.id;
  });

  if (!target) {
    throw new Error("Item not found");
  }

  target.item.itemName = String(payload.itemName).trim();
  target.item.quantity = Number(payload.quantity || 1);
  target.item.updatedAt = new Date().toISOString();
  sheet.getRange(target.rowNumber, 1, 1, HEADERS.length).setValues([itemToRow(target.item)]);
  return target.item;
}

function deleteItem(payload) {
  if (!payload.id) {
    throw new Error("id is required");
  }

  const sheet = getSheet();
  const data = getRowsWithIndex(sheet);
  const target = data.find(function(entry) {
    return entry.item.id === payload.id;
  });

  if (!target) {
    throw new Error("Item not found");
  }

  target.item.deleted = true;
  target.item.updatedAt = new Date().toISOString();
  sheet.getRange(target.rowNumber, 1, 1, HEADERS.length).setValues([itemToRow(target.item)]);
  return { id: payload.id };
}

function chooseFamily(payload) {
  if (!payload.itemName || !payload.selectedFamily) {
    throw new Error("itemName and selectedFamily are required");
  }

  const sheet = getSheet();
  const data = getRowsWithIndex(sheet);
  const key = normalizeItemName(payload.itemName);
  const now = new Date().toISOString();
  let changed = 0;

  data.forEach(function(entry) {
    if (normalizeItemName(entry.item.itemName) === key && entry.item.deleted !== true) {
      entry.item.selectedFamily = payload.selectedFamily;
      entry.item.updatedAt = now;
      sheet.getRange(entry.rowNumber, 1, 1, HEADERS.length).setValues([itemToRow(entry.item)]);
      changed += 1;
    }
  });

  return { changed: changed };
}

function getSheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  const existingHeaders = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  const needsHeaders = HEADERS.some(function(header, index) {
    return existingHeaders[index] !== header;
  });

  if (needsHeaders) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function getRowsWithIndex(sheet) {
  const values = sheet.getDataRange().getValues();
  return values.slice(1).map(function(row, index) {
    return {
      rowNumber: index + 2,
      item: rowToItem(row)
    };
  });
}

function rowToItem(row) {
  return {
    id: row[0],
    family: row[1],
    itemName: row[2],
    quantity: Number(row[3] || 1),
    selectedFamily: row[4],
    createdAt: row[5],
    updatedAt: row[6],
    deleted: row[7]
  };
}

function itemToRow(item) {
  return HEADERS.map(function(header) {
    return item[header] === undefined ? "" : item[header];
  });
}

function validateItemPayload(payload, familyOptional) {
  if (!familyOptional && !payload.family) {
    throw new Error("family is required");
  }
  if (!payload.itemName) {
    throw new Error("itemName is required");
  }
  if (Number(payload.quantity || 1) < 1) {
    throw new Error("quantity must be greater than 0");
  }
}

function normalizeItemName(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function parsePayload(value) {
  if (!value) {
    return {};
  }
  if (typeof value === "object") {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    return {};
  }
}

function ok(data) {
  return {
    ok: true,
    data: data
  };
}

function jsonp(callback, response) {
  const safeCallback = String(callback).replace(/[^\w.$]/g, "");
  return ContentService
    .createTextOutput(safeCallback + "(" + JSON.stringify(response) + ");")
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function json(response) {
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}
