from rest_framework import serializers
from .models import CustomUser,FileUpload,Recruiter,Job
class CustomUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['username', 'password', 'first_name', 'last_name']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        user = CustomUser.objects.create_user( 
            username=validated_data['username'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            password=validated_data['password']  # No need to call set_password()
        )
        return user



class FileSerializer(serializers.ModelSerializer):
    class Meta:
        model = FileUpload
        fields = ['file']  # Do not include 'user' field

    def create(self, validated_data):
        user = self.context['user']  # Get user from context
        return FileUpload.objects.create(user=user, **validated_data)

class RecruiterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)  # Add a password field to handle user password input

    class Meta:
        model = Recruiter
        fields = ['username', 'email', 'password']  # Include password in fields

    def create(self, validated_data):
        username = validated_data.get('username')
        email = validated_data.get('email')
        password = validated_data.get('password')

        # Create recruiter object
        recruiter = Recruiter.objects.create(
            username=username, 
            email=email
           
        )

        # Set and hash the password
        recruiter.set_password(password)
        recruiter.save()

        return recruiter
    
class JobSerializer(serializers.ModelSerializer):
    class Meta:
        model=Job
        fields=['id','recruiter','company_name','location','job_title','salary','job_type','job_description','job_requirements','expiry_time']
    def create(self, validated_data):
        recruiter = self.context['request'].user 
        # if not isinstance(recruiter, Recruiter):
        #     raise serializers.ValidationError({"recruiter": "Only recruiters can post jobs."}) # Assuming the recruiter is the logged-in user
        # validated_data['recruiter'] = recruiter 
        return Job.objects.create(**validated_data)

from .models import SavedJob

class SavedJobSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField()  # Returns username instead of ID
    job = serializers.StringRelatedField()   # Returns job title instead of ID

    class Meta:
        model = SavedJob
        fields = ['id', 'user', 'job', 'status']
