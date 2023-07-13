from django.contrib import admin
from .models import Tickets, Categorys

class TicketsAdmin(admin.ModelAdmin):
    list_display = ('channelid', 'messageid', 'reason', 'creator', 'claimedby', 'claimedat', 'closedby', 'closedat', 'closereason', 'transcript')


class CategorysAdmin(admin.ModelAdmin):
    list_display = ('id', 'codeName', 'name', )
    list_filter = ('codeName', )
    list_display_links = ('id', 'codeName', 'name', )
    search_fields = ('id', 'codeName', 'name', )



admin.site.register(Categorys, CategorysAdmin)
admin.site.register(Tickets, TicketsAdmin)