let parsedData = null;
let fileType = "";

document
  .getElementById("fileInput")
  .addEventListener("change", handleFileSelect);
document.getElementById("generateKML").addEventListener("click", generateKML);

// 拖放功能
const dropZone = document.querySelector(".file-upload");
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.style.borderColor = "#4361ee";
  dropZone.style.backgroundColor = "#f0f7ff";
});

dropZone.addEventListener("dragleave", (e) => {
  e.preventDefault();
  dropZone.style.borderColor = "#cbd5e1";
  dropZone.style.backgroundColor = "#f8fafc";
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.style.borderColor = "#cbd5e1";
  dropZone.style.backgroundColor = "#f8fafc";

  const file = e.dataTransfer.files[0];
  if (file) {
    document.getElementById("fileInput").files = e.dataTransfer.files;
    handleFileSelect({ target: { files: [file] } });
  }
});

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  const fileName = file.name;
  const fileExtension = fileName.split(".").pop().toLowerCase();

  // 更新步驟指示器
  document.getElementById("step1").classList.add("completed");
  document.getElementById("step2").classList.add("active");

  // 顯示檔案資訊
  document.getElementById("fileInfo").classList.remove("hidden");
  document.getElementById("fileName").textContent = `檔案名稱: ${fileName}`;
  document.getElementById(
    "fileType"
  ).textContent = `檔案類型: ${fileExtension.toUpperCase()}`;
  document.getElementById("fileSize").textContent = `檔案大小: ${formatFileSize(
    file.size
  )}`;

  fileType = fileExtension;

  // 顯示載入中
  const loadingDiv = document.createElement("div");
  loadingDiv.className = "loading";
  loadingDiv.innerHTML =
    '<div class="loading-spinner"></div><div>正在解析檔案...</div>';
  document.getElementById("fileInfo").parentNode.appendChild(loadingDiv);

  setTimeout(() => {
    const reader = new FileReader();
    reader.onload = function (e) {
      const content = e.target.result;

      try {
        switch (fileExtension) {
          case "csv":
            parsedData = parseCSV(content);
            break;
          case "json":
            parsedData = JSON.parse(content);
            break;
          case "xml":
            parsedData = parseXML(content);
            break;
          default:
            showError("不支援的檔案格式");
            return;
        }

        document.getElementById(
          "recordCount"
        ).textContent = `資料筆數: ${parsedData.length}`;

        populateColumnSelectors(parsedData);
        showPreview(parsedData);

        document.getElementById("columnSelectors").classList.remove("hidden");
        document.getElementById("previewContainer").classList.remove("hidden");
        document.getElementById("generateKML").classList.remove("hidden");

        // 移除載入中
        loadingDiv.remove();
      } catch (error) {
        loadingDiv.remove();
        showError("解析檔案時發生錯誤: " + error.message);
        console.error(error);
      }
    };

    if (
      fileExtension === "csv" ||
      fileExtension === "xml" ||
      fileExtension === "json"
    ) {
      reader.readAsText(file);
    }
  }, 500); // 短暫延遲以顯示載入動畫
}

function parseCSV(csvText) {
  const lines = csvText.split("\n");
  const headers = lines[0].split(",");

  const result = [];
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "") continue;

    const values = lines[i].split(",");
    const entry = {};

    for (let j = 0; j < headers.length; j++) {
      entry[headers[j]] = values[j];
    }

    result.push(entry);
  }

  return result;
}

function parseXML(xmlText) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");

  const result = [];

  // 尋找所有 item-* 元素
  const itemPattern = /^item-\d+$/;
  const allElements = xmlDoc.getElementsByTagName("*");
  let itemElements = [];

  for (let i = 0; i < allElements.length; i++) {
    if (itemPattern.test(allElements[i].tagName)) {
      itemElements.push(allElements[i]);
    }
  }

  // 如果找到 item-* 元素
  if (itemElements.length > 0) {
    for (let i = 0; i < itemElements.length; i++) {
      const entry = {};
      const fields = itemElements[i].children;

      for (let j = 0; j < fields.length; j++) {
        entry[fields[j].tagName] = fields[j].textContent;
      }

      result.push(entry);
    }
  } else {
    // 嘗試找到根元素下的子元素
    const rootElement = xmlDoc.documentElement;
    const childElements = rootElement.children;

    if (childElements.length > 0 && childElements[0].children.length > 0) {
      // 假設每個子元素代表一筆資料
      for (let i = 0; i < childElements.length; i++) {
        const entry = {};
        const fields = childElements[i].children;

        for (let j = 0; j < fields.length; j++) {
          entry[fields[j].tagName] = fields[j].textContent;
        }

        result.push(entry);
      }
    }
  }

  return result;
}

function populateColumnSelectors(data) {
  if (!data || data.length === 0) return;

  const nameSelect = document.getElementById("nameField");
  const xCoordSelect = document.getElementById("xCoordField");
  const yCoordSelect = document.getElementById("yCoordField");

  // 清空選項
  nameSelect.innerHTML = "";
  xCoordSelect.innerHTML = "";
  yCoordSelect.innerHTML = "";

  // 取得所有欄位名稱
  const fields = Object.keys(data[0]);

  // 填入選項
  fields.forEach((field) => {
    nameSelect.add(new Option(field, field));
    xCoordSelect.add(new Option(field, field));
    yCoordSelect.add(new Option(field, field));
  });

  // 嘗試自動選擇可能的欄位
  fields.forEach((field) => {
    const lowerField = field.toLowerCase();

    if (
      lowerField.includes("name") ||
      lowerField.includes("na") ||
      lowerField.includes("title")
    ) {
      nameSelect.value = field;
    } else if (lowerField.includes("x") || lowerField.includes("lat")) {
      xCoordSelect.value = field;
    } else if (
      lowerField.includes("y") ||
      lowerField.includes("lon") ||
      lowerField.includes("lng")
    ) {
      yCoordSelect.value = field;
    }
  });
}

function showPreview(data) {
  if (!data || data.length === 0) return;

  const previewDiv = document.getElementById("preview");
  previewDiv.innerHTML = "";

  // 創建表格
  const table = document.createElement("table");
  table.className = "preview-table";

  // 創建表頭
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  const fields = Object.keys(data[0]);
  fields.forEach((field) => {
    const th = document.createElement("th");
    th.textContent = field;
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // 創建表格內容 (最多顯示5筆)
  const tbody = document.createElement("tbody");
  const maxRows = Math.min(5, data.length);

  for (let i = 0; i < maxRows; i++) {
    const row = document.createElement("tr");

    fields.forEach((field) => {
      const td = document.createElement("td");
      td.textContent = data[i][field];
      row.appendChild(td);
    });

    tbody.appendChild(row);
  }

  table.appendChild(tbody);
  previewDiv.appendChild(table);

  if (data.length > 5) {
    const moreInfo = document.createElement("p");
    moreInfo.textContent = `... (顯示 5 / ${data.length} 筆資料)`;
    moreInfo.className = "preview-more";
    previewDiv.appendChild(moreInfo);
  }
}

function generateKML() {
  if (!parsedData || parsedData.length === 0) {
    showError("沒有可用的資料");
    return;
  }

  const nameField = document.getElementById("nameField").value;
  const xCoordField = document.getElementById("xCoordField").value;
  const yCoordField = document.getElementById("yCoordField").value;

  if (!nameField || !xCoordField || !yCoordField) {
    showError("請選擇所有必要的欄位");
    return;
  }

  // 更新步驟指示器
  document.getElementById("step2").classList.add("completed");
  document.getElementById("step3").classList.add("active");

  // 創建 KML 文件
  let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>資料點位</name>
    <Style id="pin">
      <IconStyle>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/pushpin/red-pushpin.png</href>
        </Icon>
      </IconStyle>
    </Style>
`;

  // 添加每個點位
  let validPoints = 0;
  parsedData.forEach((item) => {
    const name = item[nameField] || "未命名點位";
    const x = parseFloat(item[xCoordField]);
    const y = parseFloat(item[yCoordField]);

    if (isNaN(x) || isNaN(y)) {
      console.warn(`跳過無效座標: ${name}`);
      return;
    }

    validPoints++;

    kml += `    <Placemark>
      <name>${escapeXml(name)}</name>
      <styleUrl>#pin</styleUrl>
      <Point>
        <coordinates>${y},${x},0</coordinates>
      </Point>
    </Placemark>
`;
  });

  kml += `  </Document>
</kml>`;

  // 顯示成功訊息 - 修改這裡
  const downloadInfo = document.getElementById("downloadInfo");
  downloadInfo.classList.remove("hidden");
  downloadInfo.style.display = "flex"; // 或 "block"

  // 在成功訊息中添加點位數量
  downloadInfo.querySelector(
    "div"
  ).textContent = `KML檔案已成功產生！檔案將自動下載。共處理 ${validPoints} 個有效點位。`;

  // 下載 KML 檔案
  const blob = new Blob([kml], {
    type: "application/vnd.google-earth.kml+xml",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "points.kml";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // 移除 alert，改為自動隱藏成功訊息
  setTimeout(() => {
    downloadInfo.style.opacity = "0";
    setTimeout(() => {
      downloadInfo.style.display = "none";
      downloadInfo.style.opacity = "1";
    }, 500);
  }, 5000);
}

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
    }
  });
}

function formatFileSize(bytes) {
  if (bytes < 1024) {
    return bytes + " bytes";
  } else if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(2) + " KB";
  } else {
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }
}

function showError(message) {
  // 建立錯誤提示
  const errorDiv = document.createElement("div");
  errorDiv.className = "alert alert-error fade-in";
  errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i><div>${message}</div>`;

  // 插入到頁面
  const container = document.querySelector(".app-container");
  container.insertBefore(
    errorDiv,
    document.getElementById("generateKML").nextSibling
  );

  // 3秒後自動移除
  setTimeout(() => {
    errorDiv.style.opacity = "0";
    setTimeout(() => {
      errorDiv.remove();
    }, 300);
  }, 3000);
}
