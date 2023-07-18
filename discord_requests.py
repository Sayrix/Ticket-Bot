import requests
import json

from dotenv import dotenv_values

TOKEN = dotenv_values(".env")["TOKEN"]

VERSION = 10

def discord_user_request(userid, campo):    
    
    r = requests.get(f'https://discord.com/api/v{VERSION}/users/{userid}'
                    , headers={
                        'Authorization': f'Bot {TOKEN}'
                        }
                    )
    
    return r.json()[f'{campo}']

if __name__ == '__main__':
    
    print(discord_user_request('', 'display_name'))