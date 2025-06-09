# backend/utils/fetch_medicine_info.py
import requests
from bs4 import BeautifulSoup

def get_medicine_info(medicine_name):
    try:
        url = f"https://www.1mg.com/search/all?name={medicine_name}"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
                          " AppleWebKit/537.36 (KHTML, like Gecko)"
                          " Chrome/90.0.4430.93 Safari/537.36"
        }
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")

        # Try to find the first medicine link from search results
        medicine_link_tag = soup.select_one("a[href*='/drugs/']")
        if not medicine_link_tag:
            return {"error": f"Medicine '{medicine_name}' not found on 1mg."}

        medicine_url = "https://www.1mg.com" + medicine_link_tag['href']
        medicine_page = requests.get(medicine_url, headers=headers)
        medicine_page.raise_for_status()
        med_soup = BeautifulSoup(medicine_page.text, "html.parser")

        # Extract medicine info safely with fallback values
        name = med_soup.find("h1") 
        name = name.text.strip() if name else medicine_name.title()

        # Usage: Find <h3> tag that contains "Uses"
        usage_tag = med_soup.find("h3", string=lambda t: t and "Uses" in t)
        usage = ""
        if usage_tag:
            # The description usually follows the h3 in a sibling <div> or <p>
            usage_content = usage_tag.find_next_sibling()
            usage = usage_content.text.strip() if usage_content else ""

        # Side effects: similarly look for "Side Effects"
        side_effects_tag = med_soup.find("h3", string=lambda t: t and "Side Effects" in t)
        side_effects = ""
        if side_effects_tag:
            side_effects_content = side_effects_tag.find_next_sibling()
            side_effects = side_effects_content.text.strip() if side_effects_content else ""

        # Cost: find price span or div by common classes or keywords
        cost_tag = med_soup.select_one("div[class*='Price'] span")
        cost = cost_tag.text.strip() if cost_tag else "N/A"

        # Summary or description (optional)
        summary_tag = med_soup.find("meta", attrs={"name": "description"})
        summary = summary_tag["content"].strip() if summary_tag else ""

        return {
            "name": name,
            "usage": usage or "Usage info not available",
            "side_effects": side_effects or "Side effects info not available",
            "cost": cost,
            "summary": summary or "No summary available"
        }

    except requests.RequestException as e:
        return {"error": f"Network error while fetching medicine info: {e}"}
    except Exception as e:
        return {"error": f"Error parsing medicine info: {e}"}
