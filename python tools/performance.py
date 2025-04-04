import requests
from bs4 import BeautifulSoup
import csv
import random
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
from swiftshadow.classes import ProxyInterface

# Set up logging
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')

# Initialize Swiftshadow proxy manager
proxy_manager = ProxyInterface(
    countries=["US"], protocol="http", autoRotate=True)

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/89.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/91.0.864.64 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Opera/75.0.3969.2439 Safari/537.36"
]

HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Accept-Language": "en-US,en;q=0.5",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Cache-Control": "max-age=0",
}


def clean_value(value):
    return value.strip().replace("\n", "").replace("\r", "")


def scrape_page(url):
    while True:
        proxy = proxy_manager.get()
        if proxy is None:
            logging.warning("No proxy available, retrying...")
            time.sleep(1)
            continue

        user_agent = random.choice(USER_AGENTS)
        headers = HEADERS.copy()
        headers['User-Agent'] = user_agent
        proxies = {
            "http": f"{proxy.protocol}://{proxy.ip}:{proxy.port}",
            "https": f"{proxy.protocol}://{proxy.ip}:{proxy.port}"
        }

        try:
            response = requests.get(
                url, headers=headers, proxies=proxies, timeout=10)

            if response.status_code != 200:
                logging.warning(f"Bad status {response.status_code} for {url}")
                proxy_manager.report_dead_proxy(proxy)
                continue

            soup = BeautifulSoup(response.text, 'html.parser')
            performance_section = None
            sections = soup.find_all('section', class_='details')
            for section in sections:
                h1 = section.find('h1')
                if h1 and 'Performance' in h1.get_text():
                    performance_section = section
                    break

            if not performance_section:
                logging.warning(f"No performance section found for {url}")
                # This is considered a *valid* scrape, just no data.
                return None

            # Parse values
            rows = performance_section.find_all('tr')
            sequential_read, sequential_write, random_read, random_write, endurance = None, None, None, None, None
            for row in rows:
                th = row.find('th')
                td = row.find('td')
                if th and td:
                    th_text = clean_value(th.get_text())
                    td_text = clean_value(td.get_text())
                    if th_text == "Sequential Read:":
                        sequential_read = td_text
                    elif th_text == "Sequential Write:":
                        sequential_write = td_text
                    elif th_text == "Random Read:":
                        random_read = td_text
                    elif th_text == "Random Write:":
                        random_write = td_text
                    elif th_text == "Endurance:":
                        endurance = td_text

            sequential_rw = f"{sequential_read.replace(' MB/s', '').replace(',', '')}/{sequential_write.replace(' MB/s', '').replace(',', '')} MB/s" if sequential_read and sequential_write else 'N/A'
            random_rw = f"{random_read.replace(' IOPS', '').replace(',', '')}/{random_write.replace(' IOPS', '').replace(',', '')} IOPS" if random_read and random_write else 'N/A'
            endurance = f"{endurance.replace(' TBW', '').replace(',', '')} TBW" if endurance else 'N/A'

            logging.info(f"Scraped {url}")
            return [sequential_rw, random_rw, endurance]

        except requests.exceptions.RequestException as e:
            logging.error(
                f"Request failed for {url} with {proxy.ip}:{proxy.port} — {e}")
            continue


def scrape_urls_concurrently(urls):
    all_data = []
    with ThreadPoolExecutor(max_workers=50) as executor:
        future_to_url = {executor.submit(
            scrape_page, url): url for url in urls}
        for future in as_completed(future_to_url):
            url = future_to_url[future]
            try:
                data = future.result()
                if data:
                    all_data.append((url, data))
            except Exception as e:
                logging.error(f"Unhandled error for {url}: {e}")
    return all_data


# CSV parsing and writing
with open('ssd.csv', 'r+', newline='', encoding='utf-8') as file:
    reader = csv.reader(file)
    rows = list(reader)
    header = rows[0]
    dram_index = header.index("DRAM")
    product_url_index = header.index("Product URL")

    # Avoid duplicate header insertions
    if "Sequential R/W" not in header:
        header.insert(dram_index + 1, "Sequential R/W")
        header.insert(dram_index + 2, "Random R/W")
        header.insert(dram_index + 3, "Endurance")

    urls = [row[product_url_index] for row in rows[1:]]
    all_data = scrape_urls_concurrently(urls)
    url_data_map = {url: data for url, data in all_data}

    for row in rows[1:]:
        product_url = row[product_url_index]
        if product_url in url_data_map:
            sequential_rw, random_rw, endurance = url_data_map[product_url]
            row.insert(dram_index + 1, sequential_rw)
            row.insert(dram_index + 2, random_rw)
            row.insert(dram_index + 3, endurance)

    file.seek(0)
    writer = csv.writer(file)
    writer.writerows(rows)
    file.truncate()
