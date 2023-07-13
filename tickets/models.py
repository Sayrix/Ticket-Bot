from django.db import models


class Config(models.Model):
    key = models.CharField(max_length=256, primary_key=True)
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
        
class Categorys(models.Model):
    category_ticket = models.ForeignKey(Tickets, on_delete=models.CASCADE)
    codeName = models.CharField(max_length=255)
    name = models.CharField(max_length=255)
    
    class Meta:
        managed = True
        db_table = 'category'