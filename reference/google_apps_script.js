/**
 * Google Apps Script - 推播通知範本庫後端服務
 * 
 * 部署指引：
 * 1. 建立一份新的 Google 試算表（Google Sheets），命名為「推播通知範本庫」。
 * 2. 將第一個工作表命名為「範本」（不要使用預設的「工作表1」或「Sheet1」）。
 * 3. 在第一列（A1 - H1）建立以下標頭欄位：
 *    A1: id | B1: name | C1: tag | D1: title | E1: subtitle | F1: category | G1: createdAt | H1: usedCount
 * 4. 點擊功能表「擴充功能」 -> 「Apps Script」。
 * 5. 將原本的程式碼清空，並貼入此檔案內容。
 * 6. 點擊右上角「部署」 -> 「新增部署」。
 * 7. 選取類型為「網頁應用程式」（Web App）：
 *    - 說明：推播通知範本庫 API
 *    - 執行身分：我（您的 Google 帳號）
 *    - 誰可以存取：所有人（Anyone）
 * 8. 點擊「部署」，並授予必要的存取權限。
 * 9. 複製產生的「網頁應用程式 URL」（HTTPS endpoint），設定於前端環境變數 VITE_TEMPLATES_API_URL。
 */

function doGet(e) {
  var action = e.parameter.action;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("範本");
  
  if (!sheet) {
    return createJsonResponse({ error: "工作表 '範本' 不存在，請確認工作表名稱設定正確" });
  }
  
  if (action === "getAll") {
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return createJsonResponse([]);
    }
    
    var headers = data[0];
    var templates = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var temp = {};
      for (var j = 0; j < headers.length; j++) {
        temp[headers[j]] = row[j];
      }
      temp.usedCount = Number(temp.usedCount) || 0;
      templates.push(temp);
    }
    return createJsonResponse(templates);
  }
  
  return createJsonResponse({ error: "未知的 GET action" });
}

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("範本");
  if (!sheet) {
    return createJsonResponse({ error: "工作表 '範本' 不存在" });
  }
  
  var params;
  try {
    if (e.postData && e.postData.contents) {
      params = JSON.parse(e.postData.contents);
    } else {
      params = e.parameter;
    }
  } catch (err) {
    params = e.parameter;
  }
  
  var action = params.action;
  if (!action) {
    return createJsonResponse({ error: "缺少 action 參數" });
  }
  
  if (action === "save") {
    var id = params.id || Utilities.getUuid();
    var name = params.name || "";
    var tag = params.tag || "";
    var title = params.title || "";
    var subtitle = params.subtitle || "";
    var category = params.category || "";
    var createdAt = params.createdAt || new Date().toISOString();
    var usedCount = Number(params.usedCount) || 0;
    
    var data = sheet.getDataRange().getValues();
    var foundIndex = -1;
    for (var i = 1; i < data.length; i++) {
      if (data[i][0].toString() === id.toString()) {
        foundIndex = i + 1; // 轉為 1-based index 且加 header
        break;
      }
    }
    
    if (foundIndex !== -1) {
      sheet.getRange(foundIndex, 1, 1, 8).setValues([[id, name, tag, title, subtitle, category, createdAt, usedCount]]);
    } else {
      sheet.appendRow([id, name, tag, title, subtitle, category, createdAt, usedCount]);
    }
    
    return createJsonResponse({ 
      success: true, 
      template: { id: id, name: name, tag: tag, title: title, subtitle: subtitle, category: category, createdAt: createdAt, usedCount: usedCount } 
    });
  }
  
  if (action === "delete") {
    var id = params.id;
    if (!id) return createJsonResponse({ error: "缺少 id 參數" });
    
    var data = sheet.getDataRange().getValues();
    var deleted = false;
    for (var i = 1; i < data.length; i++) {
      if (data[i][0].toString() === id.toString()) {
        sheet.deleteRow(i + 1);
        deleted = true;
        break;
      }
    }
    return createJsonResponse({ success: deleted });
  }
  
  if (action === "incrementUsed") {
    var id = params.id;
    if (!id) return createJsonResponse({ error: "缺少 id 參數" });
    
    var data = sheet.getDataRange().getValues();
    var updated = false;
    var newUsedCount = 0;
    for (var i = 1; i < data.length; i++) {
      if (data[i][0].toString() === id.toString()) {
        newUsedCount = (Number(data[i][7]) || 0) + 1;
        sheet.getRange(i + 1, 8).setValue(newUsedCount);
        updated = true;
        break;
      }
    }
    return createJsonResponse({ success: updated, usedCount: newUsedCount });
  }
  
  return createJsonResponse({ error: "未知的 POST action" });
}

function createJsonResponse(data) {
  var JSONString = JSON.stringify(data);
  return ContentService.createTextOutput(JSONString)
    .setMimeType(ContentService.MimeType.JSON);
}
