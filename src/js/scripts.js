const csvFile = "/Rapido/data/ssd.csv";
let allData = [];

fetch(csvFile)
  .then((response) => {
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    return response.text();
  })
  .then((csvText) => {
    const rows = csvText
      .trim()
      .split("\n")
      .map((row) => row.split(","));
    rows.shift();
    allData = rows;

    populateFilters(allData);
    renderTable(allData);

    const filterElements = ["format", "dram", "type", "interface"];
    filterElements.forEach((id) => {
      document.getElementById(id).addEventListener("change", () => {
        filterTable();
        updateURL();
      });
    });

    document.getElementById("searchInput").addEventListener("input", () => {
      filterTable();
      updateURL();
    });

    document
      .getElementById("resetButton")
      .addEventListener("click", resetFilters);

    document.getElementById("clearSearch").addEventListener("click", () => {
      document.getElementById("searchInput").value = "";
      filterTable();
      updateURL();
    });

    loadFiltersFromURL();
  })
  .catch((error) => {
    console.error("Failed to fetch CSV file:", error);
  });

function populateFilters(data) {
  const formatSet = new Set();
  const typeSet = new Set();
  const interfaceSet = new Set();
  const dramSet = new Set();

  data.forEach((row) => {
    formatSet.add(cleanValue(row[3]));
    typeSet.add(cleanValue(row[2]));
    interfaceSet.add(cleanValue(row[4]));
    dramSet.add(cleanValue(row[7]));
  });

  updateDropdown("format", Array.from(formatSet));
  updateDropdown("type", Array.from(typeSet));
  updateDropdown("interface", Array.from(interfaceSet));
  updateDropdown("dram", Array.from(dramSet));
}

function cleanValue(value) {
  return value ? value.replace(/[\r\n]+/g, "").trim() : "";
}

function updateDropdown(elementId, options) {
  const select = document.getElementById(elementId);
  select.innerHTML = '<option value="">All</option>';

  options.forEach((option) => {
    const opt = document.createElement("option");
    opt.value = option;
    opt.textContent = option;
    select.appendChild(opt);
  });
}

function renderTable(data) {
  const tableBody = document.getElementById("dataTable");
  tableBody.innerHTML = "";

  data.forEach((row) => {
    const tr = document.createElement("tr");

    const modelCell = createTableCellWithLink(row[0], row[row.length - 1]);
    tr.appendChild(modelCell);

    const columnIndexes = [1, 2, 3, 4, 5, 6, 8, 9, 10, 7];
    columnIndexes.forEach((index) => {
      tr.appendChild(createTableCell(row[index]));
    });

    tableBody.appendChild(tr);
  });
}

function createTableCell(value) {
  const td = document.createElement("td");
  td.textContent = cleanValue(value);
  return td;
}

function createTableCellWithLink(text, url) {
  const td = document.createElement("td");
  const link = document.createElement("a");
  link.href = cleanValue(url);
  link.textContent = cleanValue(text);
  link.target = "_blank";
  td.appendChild(link);
  return td;
}

function filterTable() {
  const searchTerm = cleanValue(
    document.getElementById("searchInput").value
  ).toLowerCase();
  const format = cleanValue(document.getElementById("format").value);
  const dram = cleanValue(document.getElementById("dram").value);
  const type = cleanValue(document.getElementById("type").value);
  const interfaceValue = cleanValue(document.getElementById("interface").value);

  let filteredData = allData.filter((row) => {
    const modelName = cleanValue(row[0]).toLowerCase();

    return (
      (searchTerm === "" || modelName.startsWith(searchTerm)) &&
      (format === "" || cleanValue(row[3]) === format) &&
      (dram === "" || cleanValue(row[7]) === dram) &&
      (type === "" || cleanValue(row[2]) === type) &&
      (interfaceValue === "" || cleanValue(row[4]) === interfaceValue)
    );
  });

  if (format === "") {
    updateDropdown("format", getUniqueOptions(filteredData, 3));
  }
  if (type === "") {
    updateDropdown("type", getUniqueOptions(filteredData, 2));
  }
  if (interfaceValue === "") {
    updateDropdown("interface", getUniqueOptions(filteredData, 4));
  }
  if (dram === "") {
    updateDropdown("dram", getUniqueOptions(filteredData, 7));
  }

  renderTable(filteredData);
}

function getUniqueOptions(data, columnIndex) {
  const optionSet = new Set();
  data.forEach((row) => {
    optionSet.add(cleanValue(row[columnIndex]));
  });
  return Array.from(optionSet);
}

function resetFilters() {
  document.getElementById("format").value = "";
  document.getElementById("dram").value = "";
  document.getElementById("type").value = "";
  document.getElementById("interface").value = "";
  document.getElementById("searchInput").value = "";

  renderTable(allData);
  populateFilters(allData);

  window.history.pushState({}, "", window.location.pathname);

  updateURL();
}

function updateURL() {
  const searchTerm = cleanValue(document.getElementById("searchInput").value);
  const format = cleanValue(document.getElementById("format").value);
  const dram = cleanValue(document.getElementById("dram").value);
  const type = cleanValue(document.getElementById("type").value);
  const interfaceValue = cleanValue(document.getElementById("interface").value);

  const urlParams = new URLSearchParams();

  if (searchTerm) urlParams.set("search", searchTerm);

  if (format) urlParams.set("format", format);
  if (dram) urlParams.set("dram", dram);
  if (type) urlParams.set("type", type);
  if (interfaceValue) urlParams.set("interface", interfaceValue);

  window.history.pushState({}, "", "?" + urlParams.toString());
}

function loadFiltersFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  document.getElementById("format").value = urlParams.get("format") || "";
  document.getElementById("dram").value = urlParams.get("dram") || "";
  document.getElementById("type").value = urlParams.get("type") || "";
  document.getElementById("interface").value = urlParams.get("interface") || "";

  const searchTerm = urlParams.get("search") || "";
  document.getElementById("searchInput").value = searchTerm;

  filterTable();
}

function goBack() {
  window.location.href = "/Rapido";
}
