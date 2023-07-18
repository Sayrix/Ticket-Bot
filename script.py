import os
import django
from discord_requests import discord_user_request

# Setting Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ticketbotdjango.settings')
django.setup()

from tickets.models import Tickets, Tickets_Info

# Retrieve JSON field from database
ticket = Tickets.objects.all()

# Loop to insert the obtained data into the new table
for t in ticket:
    try:
        Ticket_InfoCategory = Tickets_Info()
        Ticket_InfoCategory.category_ticket = t
        Ticket_InfoCategory.category_codeName = t.category['codeName']
        Ticket_InfoCategory.category_name = t.category['name']
        
        if t.creator:
            Ticket_InfoCategory.creator_username = discord_user_request(t.creator, 'username')
            Ticket_InfoCategory.creator_displayname = discord_user_request(t.creator, 'display_name')
        if t.claimedby:
            Ticket_InfoCategory.claimedby_username = discord_user_request(t.claimedby, 'username')
            Ticket_InfoCategory.claimedby_displayname = discord_user_request(t.claimedby, 'display_name')
            
        if t.closedby:
            Ticket_InfoCategory.closedby_username = discord_user_request(t.closedby, 'username')
            Ticket_InfoCategory.closedby_displayname = discord_user_request(t.closedby, 'display_name')
        
        Ticket_InfoCategory.save()
        print('')
        print(f'{Ticket_InfoCategory} saved')
    except:
        print('')
        print(f'Something went wrong when trying to save {Ticket_InfoCategory}')
        
        