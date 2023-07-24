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
    category = models.JSONField()
    reason = models.TextField()
    creator = models.TextField()
    createdat = models.DateTimeField(auto_now_add=True)
    claimedby = models.TextField(null=True)
    claimedat = models.DateTimeField(null=True)
    closedby = models.TextField(null=True)
    closedat = models.DateTimeField(null=True)
    closereason = models.TextField(null=True)
    transcript = models.TextField(null=True)
    
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
    category_ticket = models.OneToOneField(Tickets, on_delete=models.CASCADE)
    category_codeName = models.CharField(max_length=255, null=True)
    category_name = models.CharField(max_length=255, null=True)
    creator_username = models.CharField(max_length=255, null=True)
    claimedby_username = models.CharField(max_length=255, null=True)
    closedby_username = models.CharField(max_length=255, null=True)
    
    # def __str__(self):
    #     return f'{self.category_ticket}, {self.category_codeName}, {self.category_name}'
    
    class Meta:
        managed = True
        db_table = 'tickets_info'
        