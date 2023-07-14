from django.contrib import admin
from .models import Tickets, Tickets_Info

class TicketsAdmin(admin.ModelAdmin):
    list_display = ('channelid', 'messageid', 'reason', 'creator', 'claimedby', 'claimedat', 'closedby', 'closedat', 'closereason', 'transcript')


class Tickets_InfoAdmin(admin.ModelAdmin):
    list_display = ('id', 'codeName', 'name', )
    list_filter = ('codeName', )
    list_display_links = ('id', 'codeName', 'name', )
    search_fields = ('id', 'codeName', 'name', )



admin.site.register(Tickets_Info, Tickets_InfoAdmin)
admin.site.register(Tickets, TicketsAdmin)