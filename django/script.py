import os
import django
from discord_requests import discord_user_request

# Setting Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ticketbotdjango.settings')
django.setup()

from tickets.models import Tickets, Tickets_Info

# Retrieve JSON field from database
tickets = Tickets.objects.all()

# Loop to insert the obtained data into the new table
for ticket in tickets:
    
    ticket_info = Tickets_Info()
    ticket_info.ticket_info_ticket = ticket
    ticket_info.category_codeName = ticket.category['codeName']
    ticket_info.category_name = ticket.category['name']
    
    # Verify if each of the fields isn't null
    if ticket.creator:
        ticket_info.creator_username = discord_user_request(ticket.creator, 'username')
        
    if ticket.claimedby:
        ticket_info.claimedby_username = discord_user_request(ticket.claimedby, 'username')
        
    if ticket.closedby:
        ticket_info.closedby_username = discord_user_request(ticket.closedby, 'username')    
    
    ticket_info.save()
    print('')
    print(f'Ticket: {ticket_info.pk} saved')
    