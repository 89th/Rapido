const csvFile = "../../data/ssd.csv";
let allData = [];

const capacityMapping = {
  "32GB": "32GB",
  "60GB": "60GB",
  "64GB": "64GB",
  "80GB": "80GB",
  "120GB": "128GB",
  "128GB": "128GB",
  "160GB": "160GB",
  "240GB": "240GB",
  "250GB": "256GB",
  "256GB": "256GB",
  "275GB": "256GB",
  "320GB": "320GB",
  "400GB": "400GB",
  "480GB": "512GB",
  "500GB": "512GB",
  "512GB": "512GB",
  "525GB": "525GB",
  "750GB": "750GB",
  "800GB": "800GB",
  "825GB": "825GB",
  "900GB": "900GB",
  "960GB": "1TB",
  "1TB": "1TB",
  "1.2TB": "1.2TB",
  "1.6TB": "1.6TB",
  "1.9TB": "2TB",
  "2TB": "2TB",
  "2.3TB": "2.3TB",
  "3TB": "3TB",
  "3.8TB": "4TB",
  "4TB": "4TB",
  "6TB": "6TB",
  "6.4TB": "6TB",
  "7.5TB": "8TB",
  "8TB": "8TB",
  "13TB": "13TB",
  "15TB": "15TB",
  "16TB": "16TB",
  "26TB": "26TB",
  "31TB": "31TB",
  "61TB": "61TB",
  "64TB": "64TB",
};

fetch(csvFile)
  .then((response) => response.text())
  .then((csvText) => {
    const rows = csvText
      .trim()
      .split("\n")
      .map((row) => row.split(","));
    rows.shift();
    allData = rows;

    populateFilters(allData);
    renderTable(allData);

    ["format", "dram", "type", "interface", "capacity"].forEach((id) => {
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
  .catch((error) => console.error("Failed to fetch CSV file:", error));

function populateFilters(data) {
  const formatSet = new Set();
  const typeSet = new Set();
  const interfaceSet = new Set();
  const dramSet = new Set();
  capacitySet = new Set(Object.values(capacityMapping)); // Use mapped values

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
  updateDropdown("capacity", Array.from(capacitySet));
}

function cleanValue(value) {
  return value ? value.replace(/[\r\n]+/g, "").trim() : "";
}

function updateDropdown(elementId, options, selectedValue) {
  const select = document.getElementById(elementId);
  const currentSelection = selectedValue || select.value; // Preserve selection

  select.innerHTML = ""; // Clear existing options
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "All";
  select.appendChild(defaultOption);

  options.forEach((option) => {
    const opt = document.createElement("option");
    opt.value = option;
    opt.textContent = option;
    if (option === currentSelection) {
      opt.selected = true; // Keep selection
    }
    select.appendChild(opt);
  });
}

function mapCapacity(value) {
  const mappedValue = capacityMapping[value] || value;
  return [value, mappedValue];
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
  const selectedFormat = cleanValue(document.getElementById("format").value);
  const selectedDram = cleanValue(document.getElementById("dram").value);
  const selectedType = cleanValue(document.getElementById("type").value);
  const selectedInterface = cleanValue(
    document.getElementById("interface").value
  );
  const selectedCapacity = cleanValue(
    document.getElementById("capacity").value
  );

  // Apply filtering based on selected values
  let filteredData = allData.filter((row) => {
    const modelName = cleanValue(row[0]).toLowerCase();
    let rowCapacities =
      cleanValue(row[1]).match(/\d+(\.\d+)?\s?(GB|TB)/g) || [];
    rowCapacities = rowCapacities.map((cap) => cap.replace(/\s/, ""));
    rowCapacities = rowCapacities.flatMap((cap) => [
      cap,
      capacityMapping[cap] || cap,
    ]);

    return (
      (searchTerm === "" || modelName.startsWith(searchTerm)) &&
      (selectedFormat === "" || cleanValue(row[3]) === selectedFormat) &&
      (selectedDram === "" || cleanValue(row[7]) === selectedDram) &&
      (selectedType === "" || cleanValue(row[2]) === selectedType) &&
      (selectedInterface === "" || cleanValue(row[4]) === selectedInterface) &&
      (selectedCapacity === "" || rowCapacities.includes(selectedCapacity))
    );
  });

  // Get valid values for each filter based on remaining data
  const availableFormats = getUniqueOptions(filteredData, 3);
  const availableTypes = getUniqueOptions(filteredData, 2);
  const availableInterfaces = getUniqueOptions(filteredData, 4);
  const availableDrams = getUniqueOptions(filteredData, 7);
  const availableCapacities = getUniqueCapacities(filteredData);

  // Preserve selected values if still valid
  ensureSelectedValue(availableFormats, selectedFormat);
  ensureSelectedValue(availableTypes, selectedType);
  ensureSelectedValue(availableInterfaces, selectedInterface);
  ensureSelectedValue(availableDrams, selectedDram);
  ensureSelectedValue(availableCapacities, selectedCapacity);

  // Update dropdowns with valid options while preserving selections
  updateDropdown("capacity", availableCapacities, selectedCapacity);
  updateDropdown("format", availableFormats, selectedFormat);
  updateDropdown("type", availableTypes, selectedType);
  updateDropdown("interface", availableInterfaces, selectedInterface);
  updateDropdown("dram", availableDrams, selectedDram);

  renderTable(filteredData);
}

function ensureSelectedValue(set, value) {
  if (value) set.add(value); // Ensure the selected value is not removed from the dropdown
}

function getUniqueOptions(data, columnIndex) {
  const optionSet = new Set();
  data.forEach((row) => {
    optionSet.add(cleanValue(row[columnIndex]));
  });
  return Array.from(optionSet);
}

function getUniqueCapacities(data) {
  const capacitySet = new Set();
  data.forEach((row) => {
    let rowCapacities =
      cleanValue(row[1]).match(/\d+(\.\d+)?\s?(GB|TB)/g) || [];
    rowCapacities = rowCapacities.map((cap) => cap.replace(/\s/, ""));
    rowCapacities.forEach((cap) =>
      capacitySet.add(capacityMapping[cap] || cap)
    );
  });
  return Array.from(capacitySet).sort((a, b) => parseInt(a) - parseInt(b));
}

function ensureSelectedValue(set, value) {
  if (value && !set.includes(value)) set.push(value); // Keep selected value if still valid
}

function resetFilters() {
  ["format", "dram", "type", "interface", "capacity"].forEach((id) => {
    document.getElementById(id).value = "";
  });
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
  const capacity = cleanValue(document.getElementById("capacity").value);

  const urlParams = new URLSearchParams();
  if (searchTerm) urlParams.set("search", searchTerm);
  if (format) urlParams.set("format", format);
  if (dram) urlParams.set("dram", dram);
  if (type) urlParams.set("type", type);
  if (interfaceValue) urlParams.set("interface", interfaceValue);
  if (capacity) urlParams.set("capacity", capacity);

  window.history.pushState({}, "", "?" + urlParams.toString());
}

function loadFiltersFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  document.getElementById("format").value = urlParams.get("format") || "";
  document.getElementById("dram").value = urlParams.get("dram") || "";
  document.getElementById("type").value = urlParams.get("type") || "";
  document.getElementById("interface").value = urlParams.get("interface") || "";
  document.getElementById("capacity").value = urlParams.get("capacity") || "";

  const searchTerm = urlParams.get("search") || "";
  document.getElementById("searchInput").value = searchTerm;

  filterTable();
}

function goBack() {
  window.location.href = "/Rapido";
}
