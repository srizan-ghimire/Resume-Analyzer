from django.db import models
from django.contrib.auth.models import AbstractUser,User
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.contrib.auth.hashers import make_password,check_password
# Create your models here.
def validate_file_extension(value):
    if not value.name.endswith(('.pdf', '.docx')):
        raise ValidationError('Only PDF and DOCX files are allowed.')

#Changed to Customuser
class CustomUser(AbstractUser):  
    username=models.CharField(max_length=50,unique=True,blank=False)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    email=models.EmailField(max_length=100,blank=False,null=False)


class FileUpload(models.Model):
    user=models.ForeignKey(CustomUser,on_delete=models.CASCADE)
    file=models.FileField(upload_to='documents/',validators=[validate_file_extension],blank=False,null=False)
    upload_time=models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} has resume/cv {self.file.name}"
    

    #For recruiter
class Recruiter(models.Model):
 
    username = models.CharField(max_length=50, unique=True, blank=False, null=False)
    password = models.CharField(max_length=128, blank=False, null=False)  # For storing hashed password
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    email = models.EmailField(unique=True, blank=False, null=False)
    

    def __str__(self):
        return self.username
    def set_password(self, password):
        """Manually hash the password before saving."""
        self.password = make_password(password)
    def check_password(self, password):
        """Check the password using Django's check_password method."""
        return check_password(password, self.password)
    
class Job(models.Model):
    JOB_TYPES=[
        ("Intern","Intern"),
        ("Full-Time","Full-Time"),
        ("Part-Time","Part-Time"),
        ("Temporary","Temporary"),
        ("Contract","Contract")
    ]
    recruiter=models.ForeignKey(Recruiter,on_delete=models.CASCADE)
    company_name=models.CharField(max_length=100,blank=False,null=False)
    location=models.CharField(max_length=100,blank=False,null=False)
    job_title=models.CharField(max_length=100,blank=False,null=False)
    salary=models.DecimalField(max_digits=10,decimal_places=2,null=True,blank=False)
    job_type=models.CharField(max_length=100,choices=JOB_TYPES,default="Full-Time")
    job_description=models.TextField()
    job_requirements=models.TextField()
    posted_at=models.DateTimeField(auto_now_add=True)
    expiry_time=models.DateTimeField(null=False,blank=False)
    is_active=models.BooleanField(default=True)
    

    def __str__(self):
        return f"{self.job_title} has been posted by {self.company_name} by recruiter {self.recruiter}"
    
    class Meta:
        ordering=['expiry_time']

    def is_expired(self):
        if self.expiry_time:
            return timezone.now() > self.expiry_time
        return False
    
class SavedJob(models.Model):
    STATUS_CHOICES = [
        ("In Review", "In Review"),
        ("Accepted", "Accepted"),
        ("Rejected", "Rejected")
    ]
    user=models.ForeignKey(CustomUser,on_delete=models.CASCADE)
    job=models.ForeignKey(Job,on_delete=models.CASCADE)
    status = models.CharField(max_length=100, choices=STATUS_CHOICES, default='IN Review')
    def __str__(self):
        return f"{self.user } has applied to {self.job.job_title}"
    
    class Meta:
        verbose_name = "Job Application"
    
