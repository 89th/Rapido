import requests
from bs4 import BeautifulSoup
import csv
import random
import re
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
import logging

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')

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


def get_proxy(delay=1):
    while True:
        try:
            response = requests.get(
                "https://gimmeproxy.com/api/getProxy?protocol=socks5")
            if response.status_code == 200:
                proxy_data = response.json()
                return {
                    "http": f"socks5://{proxy_data['ip']}:{proxy_data['port']}",
                    "https": f"socks5://{proxy_data['ip']}:{proxy_data['port']}"
                }
            else:
                continue
        except Exception as e:
            pass
        time.sleep(delay)


def clean_value(value):
    return value.strip().replace("\n", "").replace("\r", "")


def scrape_page(url):
    user_agent = random.choice(USER_AGENTS)
    headers = HEADERS.copy()
    headers['User-Agent'] = user_agent
    proxy = get_proxy()
    if proxy is None:
        return None
    while True:
        try:
            response = requests.get(
                url, headers=headers, proxies=proxy, timeout=10)
            if response.status_code == 200:
                logging.info(
                    f"Successfully fetched and scraped {url}")
                soup = BeautifulSoup(response.text, 'html.parser')
                table = soup.find('table', class_='drives-desktop-table')
                if table:
                    rows = table.find_all('tr')
                    data = []
                    for row in rows:
                        cells = row.find_all('td')
                        if not cells:
                            continue
                        model_capacity_cell = cells[0]
                        model_name_tag = model_capacity_cell.find(
                            'a', class_='drive-name')
                        model_name = clean_value(model_name_tag.get_text(
                            strip=True)) if model_name_tag else 'Unknown Model'
                        product_url_tag = model_capacity_cell.find(
                            'a', class_='drive-name')
                        product_url = f"https://www.techpowerup.com{
                            product_url_tag['href']}" if product_url_tag else 'No URL'
                        capacities = model_capacity_cell.find_all(
                            'a', class_='drive-capacity')
                        capacity_list = [clean_value(capacity.get_text(
                            strip=True)) for capacity in capacities]
                        capacity_str = ' '.join(capacity_list)
                        type_cell = cells[1]
                        type_parts = clean_value(
                            type_cell.get_text(" ", strip=True)).split(" ")
                        nand_type = type_parts[0]
                        format_ = clean_value(
                            re.sub(r'\"', '', cells[2].get_text(strip=True)))
                        interface = clean_value(cells[3].get_text(strip=True))
                        released = clean_value(cells[4].get_text(strip=True))
                        released_match = re.search(r'\b\d{4}\b', released)
                        released = released_match.group(
                            0) if released_match else 'Unknown'
                        controller = clean_value(cells[5].get_text(strip=True))
                        dram_raw = clean_value(cells[6].get_text(strip=True))
                        if "DRAM-less" in dram_raw:
                            dram = "No" if "HMB" not in dram_raw else "HMB"
                        else:
                            dram = "Yes"
                        row_data = [model_name, capacity_str, nand_type, format_,
                                    interface, released, controller, dram, product_url]
                        data.append(row_data)
                    logging.info(f"Successfully scraped data from {url}")
                    return data
        except requests.exceptions.RequestException as e:
            proxy = get_proxy()
            if proxy is None:
                continue


def scrape_urls_concurrently(urls):
    all_data = []
    with ThreadPoolExecutor(max_workers=25) as executor:
        future_to_url = {executor.submit(
            scrape_page, url): url for url in urls}
        for future in as_completed(future_to_url):
            url = future_to_url[future]
            try:
                data = future.result()
                if data:
                    all_data.extend(data)
            except Exception as e:
                pass
    return all_data


def delete_existing_files():
    files = ['../data/ssd.csv']
    for file in files:
        if os.path.exists(file):
            os.remove(file)


delete_existing_files()
with open('../data/ssd.csv', 'w', newline='', encoding='utf-8') as file:
    writer = csv.writer(file)
    writer.writerow(['Model', 'Capacity', 'NAND Type', 'Format',
                    'Interface', 'Released', 'Controller', 'DRAM', 'Product URL'])
    with open('urls.txt', 'r') as url_file:
        urls = [url.strip() for url in url_file.readlines() if url.strip()]
    all_data = scrape_urls_concurrently(urls)
    all_data.sort(key=lambda x: x[0].lower() if isinstance(x[0], str) else "")
    for row in all_data:
        writer.writerow(row)
