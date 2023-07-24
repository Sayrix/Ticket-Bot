from django.db import models


class Config(models.Model):
    key = models.CharField(max_length=255, primary_key=True)
    value = models.TextField()
    
    class Meta:
        managed = False
        db_table = 'config'

class Tickets(models.Model):
    channelid = models.TextField(unique=True)
    messageid = models.TextField(unique=True)
    category = models.JSONField(blank=True)
    reason = models.TextField(blank=True)
    creator = models.TextField(blank=True)
    createdat = models.IntegerField(blank=True)
    claimedby = models.TextField(null=True, blank=True)
    claimedat = models.IntegerField(null=True, blank=True)
    closedby = models.TextField(null=True, blank=True)
    closedat = models.IntegerField(blank=True)
    closereason = models.TextField(null=True, blank=True)
    transcript = models.TextField(null=True, blank=True)
    
    class Meta:
        managed = False
        db_table = 'tickets'
        
class Tickets_Temp_Log(models.Model):
    ticket = models.ForeignKey(Tickets, on_delete=models.CASCADE)
    action = models.CharField(max_length=50)
    
    class Meta:
        managed = True
        db_table = 'tickets_temp_log'

class Tickets_Info(models.Model):
    ticket_info_ticket = models.OneToOneField(Tickets, on_delete=models.CASCADE)
    category_codeName = models.CharField(max_length=255, null=True, blank=True)
    category_name = models.CharField(max_length=255, null=True, blank=True)
    creator_username = models.CharField(max_length=255, null=True, blank=True)
    claimedby_username = models.CharField(max_length=255, null=True, blank=True)
    closedby_username = models.CharField(max_length=255, null=True, blank=True)
    
    # def __str__(self):
    #     return f'{self.category_ticket}, {self.category_codeName}, {self.category_name}'
    
    class Meta:
        managed = True
        db_table = 'tickets_info'
        