const csvFile = "data/ssd.csv";
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

    // I don't know what event is equivalent to "change" for these dropdowns
    /*["format", "dram", "type", "interface", "capacity"].forEach((id) => {
      document.getElementById(id).addEventListener("change", () => {
        filterTable();
        updateURL();
      });
    });*/

    document.getElementById("searchButton").addEventListener("click", () => {
      filterTable();
      //updateURL();
    });

    let searchTimeout;
    document.getElementById("searchInput").addEventListener("input", () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        filterTable();
        //updateURL();
      }, 300); // 300ms debounce
    });

    document
      .getElementById("resetButton")
      .addEventListener("click", resetFilters);

    document.getElementById("clearSearch").addEventListener("click", () => {
      document.getElementById("searchInput").value = "";
      filterTable();
      //updateURL();
    });

    // TODO: Make this work for multiple selections
    //loadFiltersFromURL();
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

function cleanValues(unclean_values) {
  return unclean_values
    .filter((value) => value.trim() !== "")
    .map((value) => value.replace(/[\r\n]+/g, "").trim());
}

function updateDropdown(elementId, options, selectedValue) {
  const select = document.getElementById(elementId);
  const currentSelection = selectedValue || select.value; // Preserve selection

  select.innerHTML = ""; // Clear existing options
  /*const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "All";
  select.appendChild(defaultOption);*/

  options.forEach((option) => {
    const opt = document.createElement("option");
    opt.value = option;
    opt.textContent = option;
    if (option === currentSelection) {
      opt.selected = true; // Keep selection
    }
    select.appendChild(opt);
  });
  select.loadOptions();
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

function getSelectedOptions(element_id) {
  return Array.from(document.getElementById(element_id).selectedOptions).map(
    (option) => option.value
  );
}

function filterTable() {
  const searchTerm = cleanValue(
    document.getElementById("searchInput").value
  ).toLowerCase();
  const selectedFormat = cleanValues(getSelectedOptions("format"));
  const selectedDram = cleanValues(getSelectedOptions("dram"));
  const selectedType = cleanValues(getSelectedOptions("type"));
  const selectedInterface = cleanValues(getSelectedOptions("interface"));
  const selectedCapacity = cleanValues(getSelectedOptions("capacity"));

  // Preprocess capacities only once
  const preprocessedCapacities = preprocessCapacities(allData);

  // Apply filtering based on selected values
  let filteredData = allData.filter((row, index) => {
    const modelName = cleanValue(row[0]).toLowerCase();
    let rowCapacities = preprocessedCapacities[index];

    return (
      (searchTerm === "" || modelName.startsWith(searchTerm)) &&
      (selectedFormat.length === 0 ||
        selectedFormat.includes(cleanValue(row[3]))) &&
      (selectedDram.length === 0 ||
        selectedDram.includes(cleanValue(row[7]))) &&
      (selectedType.length === 0 ||
        selectedType.includes(cleanValue(row[2]))) &&
      (selectedInterface.length === 0 ||
        selectedInterface.includes(cleanValue(row[4]))) &&
      (selectedCapacity.length === 0 ||
        selectedCapacity.some((c) => rowCapacities.includes(c)))
    );
  });

  // Get valid values for each filter based on remaining data
  /*const availableFormats = getUniqueOptions(filteredData, 3);
  const availableTypes = getUniqueOptions(filteredData, 2);
  const availableInterfaces = getUniqueOptions(filteredData, 4);
  const availableDrams = getUniqueOptions(filteredData, 7);
  const availableCapacities = getUniqueCapacities(filteredData);*/

  // Preserve selected values if still valid
  /*ensureSelectedValues(availableFormats, selectedFormat);
  ensureSelectedValues(availableTypes, selectedType);
  ensureSelectedValues(availableInterfaces, selectedInterface);
  ensureSelectedValues(availableDrams, selectedDram);
  ensureSelectedValues(availableCapacities, selectedCapacity);*/

  // Update dropdowns with valid options while preserving selections
  /*updateDropdown("capacity", availableCapacities, selectedCapacity);
  updateDropdown("format", availableFormats, selectedFormat);
  updateDropdown("type", availableTypes, selectedType);
  updateDropdown("interface", availableInterfaces, selectedInterface);
  updateDropdown("dram", availableDrams, selectedDram);*/

  renderTable(filteredData);
}

/*function ensureSelectedValues(set, values) {
  if (value && !set.includes(value)) set.push(value); // Keep selected value if still valid
}*/

/*function getUniqueOptions(data, columnIndex) {
  const optionSet = new Set();
  data.forEach((row) => {
    optionSet.add(cleanValue(row[columnIndex]));
  });
  return Array.from(optionSet);
}*/

/*function getUniqueCapacities(data) {
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
}*/

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

  //updateURL();
}

function updateURL() {
  const searchTerm = cleanValue(document.getElementById("searchInput").value);
  const format = cleanValues(getSelectedOptions("format"));
  const dram = cleanValues(getSelectedOptions("dram"));
  const type = cleanValues(getSelectedOptions("type"));
  const interfaceValue = cleanValues(getSelectedOptions("interface"));
  const capacity = cleanValues(getSelectedOptions("capacity"));

  const urlParams = new URLSearchParams();
  if (searchTerm) urlParams.set("search", searchTerm);
  if (format) urlParams.set("format", format.join(","));
  if (dram) urlParams.set("dram", dram.join(","));
  if (type) urlParams.set("type", type.join(","));
  if (interfaceValue) urlParams.set("interface", interfaceValue.join(","));
  if (capacity) urlParams.set("capacity", capacity.join(","));

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

/*function goBack() {
  window.location.href = "/Rapido";
}*/
