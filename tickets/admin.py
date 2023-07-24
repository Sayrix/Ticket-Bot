from django.contrib import admin
from .models import Tickets, Tickets_Info

class TicketsAdmin(admin.ModelAdmin):
    list_display = ('channelid', 'messageid', 'reason', 'creator', 'claimedby', 'claimedat', 'closedby', 'closedat', 'closereason', 'transcript')

class Tickets_InfoAdmin(admin.ModelAdmin):
    list_display = ('id', 'category_codeName',
                    'category_name', 'creator_username', 
                    'claimedby_username', 
                    'closedby_username',)
    list_filter = ('category_name', 'category_codeName', )
    list_display_links = ('id', 'category_codeName', 'category_name', )
    search_fields = ('id', 'category_codeName',
                    'category_name', 'creator_username', 
                    'claimedby_username', 
                    'closedby_username',)


admin.site.register(Tickets_Info, Tickets_InfoAdmin)
admin.site.register(Tickets, TicketsAdmin)