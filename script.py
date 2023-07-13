import os
import django

# Setting Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ticketbotdjango.settings')
django.setup()

from tickets.models import Tickets, Categorys

# Retrieve JSON field from database
ticket = Tickets.objects.all()

# Loop to insert the obtained data into the new table
for t in ticket:
    Category = Categorys()
    Category.category_ticket = t
    Category.codeName = t.category['codeName']
    Category.name = t.category['name']
    Category.save()


