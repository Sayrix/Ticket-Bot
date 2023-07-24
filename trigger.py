from tickets.models import Tickets_Info, Tickets_Temp_Log, Tickets
from discord_requests import discord_user_request
import os
import time
import django

# Setting Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ticketbotdjango.settings')
django.setup()

while True:
    
    # Retrieve all temp logs from database
    tickets_temp_log = Tickets_Temp_Log.objects.all()

    # Loop to insert the obtained data into tickets_info
    for temp in tickets_temp_log:
        
        # Verify if the 
        if (temp.action == 'CREATED'):
            
            ticket_info = Tickets_Info()
            # Get the ticket of the ticket info
            ticket = Tickets.objects.get(pk=temp.ticket_id)
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
            
            # Create the ticket info to the database
            ticket_info.save()
            print('')
            print(f'Ticket: {ticket_info.pk} saved')
            
            # Detele the temp log
            temp.delete()
            
        elif (temp.action == 'UPDATED'):
            
            # Sets existing ticket from ticket_temp_log to variable
            ticket = temp.ticket
            # Sets existing ticket_info from ticket to variable
            ticket_info = ticket.tickets_info
            
            # Verify if each of the fields isn't null
            if ticket.creator:
                ticket_info.creator_username = discord_user_request(ticket.creator, 'username')
                
            if ticket.claimedby:
                ticket_info.claimedby_username = discord_user_request(ticket.claimedby, 'username')
                
            if ticket.closedby:
                ticket_info.closedby_username = discord_user_request(ticket.closedby, 'username')
                
            # Update the ticket info to the database
            ticket_info.save()
            
            print('')
            print(f'Ticket: {ticket_info.pk} saved')
            # Detele the temp log
            temp.delete()
        
        # It is to be always CREATED or UPDATED, theoretically it is to never enter that else
        else:
            print('Something is wrong with your trigger')
            break
        
        # Sleep of 1 minute for the loot
        time.sleep(60)
        
        

            