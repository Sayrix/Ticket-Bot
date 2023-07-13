from django.db import models


class Config(models.Model):
    key = models.CharField(max_length=256, primary_key=True)
    value = models.TextField()

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

class Invites(models.Model):
    ticketid = models.TextField()
    userid = models.TextField()
    ticket = models.ForeignKey(Tickets, on_delete=models.CASCADE, related_name='invites')
