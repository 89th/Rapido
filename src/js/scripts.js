const csvFile = "/Rapido/data/ssd.csv";
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

    let searchTimeout;
    document.getElementById("searchInput").addEventListener("input", () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        filterTable();
        updateURL();
      }, 300); // 300ms debounce
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
  const filterSets = {
    format: new Set(),
    type: new Set(),
    interface: new Set(),
    dram: new Set(),
    capacity: new Set(Object.values(capacityMapping)),
  };

  data.forEach((row) => {
    filterSets.format.add(cleanValue(row[3]));
    filterSets.type.add(cleanValue(row[2]));
    filterSets.interface.add(cleanValue(row[4]));
    filterSets.dram.add(cleanValue(row[7]));

    let rowCapacities =
      cleanValue(row[1]).match(/\d+(\.\d+)?\s?(GB|TB)/g) || [];
    rowCapacities = rowCapacities.map((cap) => cap.replace(/\s/, ""));
    rowCapacities.forEach((cap) =>
      filterSets.capacity.add(capacityMapping[cap] || cap)
    );
  });

  Object.keys(filterSets).forEach((key) => {
    updateDropdown(key, Array.from(filterSets[key]));
  });
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
  let tableHTML = "";

  data.forEach((row) => {
    const modelCell = createTableCellWithLink(row[0], row[row.length - 1]);
    let rowHTML = `<tr>${modelCell.outerHTML}`;

    const columnIndexes = [1, 2, 3, 4, 5, 6, 8, 9, 10, 7];
    columnIndexes.forEach((index) => {
      rowHTML += createTableCell(row[index]).outerHTML;
    });

    rowHTML += `</tr>`;
    tableHTML += rowHTML;
  });

  tableBody.innerHTML = tableHTML; // Insert all rows at once
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

  // Preprocess capacities only once
  const preprocessedCapacities = preprocessCapacities(allData);

  // Apply filtering based on selected values
  let filteredData = allData.filter((row, index) => {
    const modelName = cleanValue(row[0]).toLowerCase();
    let rowCapacities = preprocessedCapacities[index];

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
  if (value && !set.includes(value)) set.push(value); // Keep selected value if still valid
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

function preprocessCapacities(data) {
  return data.map((row) => {
    let rowCapacities =
      cleanValue(row[1]).match(/\d+(\.\d+)?\s?(GB|TB)/g) || [];
    rowCapacities = rowCapacities.map((cap) => cap.replace(/\s/, ""));
    return rowCapacities.flatMap((cap) => [cap, capacityMapping[cap] || cap]);
  });
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
