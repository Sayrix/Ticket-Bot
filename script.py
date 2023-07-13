import os
import django

# Configurar as definições do Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ticketbotdjango.settings')
django.setup()

from tickets.models import Tickets, Categorys


# Recuperar o campo JSON do banco de dados
ticket = Tickets.objects.all()

for t in ticket:
    Category = Categorys()
    Category.category_ticket = t
    Category.codeName = t.category['codeName']
    Category.name = t.category['name']
    print(t)
    print(t.category['codeName'])
    print(t.category['name'])
    Category.save()


