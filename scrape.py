import requests
from bs4 import BeautifulSoup
import csv
import time
import random
import re
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed

# Configure logging
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')

# List of User-Agents to avoid being blocked
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/89.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/91.0.864.64 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Opera/75.0.3969.2439 Safari/537.36"
]

# Common headers to include
HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Accept-Language": "en-US,en;q=0.5",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Cache-Control": "max-age=0",
}

# Function to fetch SOCKS5 proxy


def get_proxy():
    try:
        response = requests.get(
            "https://gimmeproxy.com/api/getProxy?protocol=socks5")
        if response.status_code == 200:
            proxy_data = response.json()
            logging.info(f"Fetched proxy: {proxy_data['ip']}:{
                         proxy_data['port']}")
            return {
                "http": f"socks5://{proxy_data['ip']}:{proxy_data['port']}",
                "https": f"socks5://{proxy_data['ip']}:{proxy_data['port']}"
            }
        else:
            logging.error("Failed to fetch proxy.")
            return None
    except Exception as e:
        logging.error(f"Error fetching proxy: {e}")
        return None

# Clean the value by removing unwanted characters or whitespace


def clean_value(value):
    return value.strip().replace("\n", "").replace("\r", "")

# Function to scrape a single page and return data


def scrape_page(url):
    logging.info(f"Scraping {url}...")

    # Randomly select a User-Agent from the list
    user_agent = random.choice(USER_AGENTS)
    headers = HEADERS.copy()
    headers['User-Agent'] = user_agent

    proxy = get_proxy()
    if proxy is None:
        logging.error("Could not fetch a proxy. Skipping URL...")
        return None

    while True:
        try:
            response = requests.get(
                url, headers=headers, proxies=proxy, timeout=10)

            if response.status_code == 200:
                logging.info(f"Successfully retrieved {url}")
                # Parse the content of the page using BeautifulSoup
                soup = BeautifulSoup(response.text, 'html.parser')

                table = soup.find('table', class_='drives-desktop-table')

                if table:
                    logging.info(f"Found table on {url}")
                    # Extract all rows from the table
                    rows = table.find_all('tr')

                    # Prepare the data to be written to CSV
                    data = []

                    # Iterate over each row and extract cell data
                    for row in rows:
                        cells = row.find_all('td')

                        # Skip header row or rows without data
                        if not cells:
                            continue

                        # Extract the model name and capacity links
                        model_capacity_cell = cells[0]
                        model_name_tag = model_capacity_cell.find(
                            'a', class_='drive-name')
                        model_name = clean_value(model_name_tag.get_text(
                            strip=True)) if model_name_tag else 'Unknown Model'

                        # Capture the product URL from the <a> tag with class 'drive-name'
                        product_url_tag = model_capacity_cell.find(
                            'a', class_='drive-name')
                        product_url = f"https://www.techpowerup.com{
                            product_url_tag['href']}" if product_url_tag else 'No URL'

                        capacities = model_capacity_cell.find_all(
                            'a', class_='drive-capacity')

                        # Clean and join all capacities into a single string, ensuring no extra spaces
                        capacity_list = [clean_value(capacity.get_text(
                            strip=True)) for capacity in capacities]
                        capacity_str = ' '.join(capacity_list)

                        # Extract NAND Type (only the first value before <br>)
                        type_cell = cells[1]
                        type_parts = clean_value(
                            type_cell.get_text(" ", strip=True)).split(" ")
                        nand_type = type_parts[0]  # Only get the first part

                        # Extract other fields (Format, Interface, Released, Controller, DRAM)
                        format_ = clean_value(
                            re.sub(r'\"', '', cells[2].get_text(strip=True)))
                        interface = clean_value(cells[3].get_text(strip=True))
                        released = clean_value(cells[4].get_text(strip=True))
                        released_match = re.search(r'\b\d{4}\b', released)
                        released = released_match.group(
                            0) if released_match else 'Unknown'
                        controller = clean_value(cells[5].get_text(strip=True))
                        dram_raw = clean_value(cells[6].get_text(strip=True))

                        # Check if DRAM is present or not (and if it has HMB if it is not present)
                        if "DRAM-less" and "HMB" in dram_raw:
                            dram = "HMB"
                        elif "DRAM-less" in dram_raw:
                            dram = "No"
                        else:
                            dram = "Yes"

                        # Prepare the row data with product URL
                        row_data = [model_name, capacity_str, nand_type, format_,
                                    interface, released, controller, dram, product_url]

                        # Append the cleaned row to the data list
                        data.append(row_data)
                        logging.info(f"Prepared data for model: {model_name}")

                    return data
                else:
                    logging.warning(f"No table found on {url}")
                break
            else:
                logging.error(f"Failed to retrieve {url}. Status code: {
                              response.status_code}")
                break
        except requests.exceptions.RequestException as e:
            logging.error(f"Request failed for {url}: {e}")
            logging.info("Retrying with a new proxy...")
            proxy = get_proxy()
            if proxy is None:
                logging.error("Could not fetch a new proxy. Exiting...")
                return None

# Function to handle concurrent scraping


def scrape_urls_concurrently(urls):
    all_data = []
    with ThreadPoolExecutor(max_workers=5) as executor:
        future_to_url = {executor.submit(
            scrape_page, url): url for url in urls}
        for future in as_completed(future_to_url):
            url = future_to_url[future]
            try:
                data = future.result()
                if data:
                    all_data.extend(data)
            except Exception as e:
                logging.error(f"Error scraping {url}: {e}")
    return all_data


# Open the CSV file in write mode
with open('ssd.csv', 'w', newline='', encoding='utf-8') as file:
    writer = csv.writer(file)

    # Write headers
    writer.writerow(['Model', 'Capacity', 'NAND Type', 'Format',
                    'Interface', 'Released', 'Controller', 'DRAM', 'Product URL'])
    logging.info("CSV headers written")

    # Read URLs from urls.txt file
    with open('urls.txt', 'r') as url_file:
        urls = [url.strip() for url in url_file.readlines() if url.strip()]

    # Scrape URLs concurrently
    all_data = scrape_urls_concurrently(urls)

    # Ensure sorting by the "Model" column (case insensitive for consistency)
    all_data.sort(key=lambda x: x[0].lower() if isinstance(x[0], str) else "")

    # Debugging: Log sorted models
    logging.info(f"Sorted models: {[row[0] for row in all_data[:10]]}")

    # Write sorted data to CSV
    for row in all_data:
        writer.writerow(row)

    logging.info("Scraping completed and data written to 'ssd.csv'.")
