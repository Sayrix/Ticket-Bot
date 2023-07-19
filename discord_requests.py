import requests


from dotenv import dotenv_values

# You will need to create an .env and assign the value of your token to the constant TOKEN
TOKEN = dotenv_values(".env")["TOKEN"]

VERSION = 10

# This function needs to receive as a parameter the userid that will be consulted, and which field will be returned
# If you leave field blank, will retorn the entire JSON
# The field can be: id, username, avatar, discriminator, public_flags, flags, banner, accent_color
# global_name, avatar_decoration, display_name, banner_color
def discord_user_request(userid, field=None):
    r = requests.get(f'https://discord.com/api/v{VERSION}/users/{userid}'
                    , headers={
                        'Authorization': f'Bot {TOKEN}'
                        }
                    )
    if field:
        return r.json()[f'{field}']
    else:
        return r.json()

# Just for testing
    
if __name__ == '__main__':
    
    # USER just for testing
    USER = dotenv_values(".env")["USER"]
    
    print(discord_user_request(USER))