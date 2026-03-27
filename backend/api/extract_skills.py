import re
import pandas as pd

# Use a raw string (r'...') to avoid issues with backslashes
file_path = r'D:/ResumeAnalyzer/backend/static/skills.csv'
column_name = "skills"  # Ensure this matches the actual column name in your CSV

try:
    # Try reading with UTF-8 encoding
    df = pd.read_csv(file_path, encoding='utf-8')
except UnicodeDecodeError:
    # If UTF-8 fails, try Latin-1 encoding
    df = pd.read_csv(file_path, encoding='latin1')

# Ensure the column exists in the dataframe
if column_name in df.columns:
    # Extract the skills column and drop NaN values
    skills = df[column_name].dropna().tolist()

else:
    print(f"Error: Column '{column_name}' not found in the CSV file.")

education = [
    'MBA', 'Bsc.CSIT', 'BIM', 'Btech', 'Phd', 'Msc', 'Bsc', 'BBA', 'BBS', 'Bsc.IT', 'Bsc.CS', 'Bsc.CSIT',
    'Bachelors in Computer Science and Information Technology', 'bachelor in Information Technology',
    'Bachelors in Information Technology', 'Bachelors in Computer Science', 
    'Bachelors in Computer Engineering', 'Bachelors in Computer Application', 
    'Bachelors in Computer Science and Engineering', 'Bachelor in CSIT',
    'Bachelor', 'Master', 'PhD', 'Associate', 'Diploma', 'Certificate',
    'Computer Science', 'Information Technology', 'Engineering', 
    'Business Administration', 'Data Science', 'Statistics', 'Mathematics',
    'Artificial Intelligence', 'Machine Learning', 'Computer Engineering',
     # Bachelor's Degrees
    'BSc.CSIT ',' Bachelor of Science in Computer Science and Information Technology',
    'BSc.IT ',' Bachelor of Science in Information Technology',
    'BSc.CS ',' Bachelor of Science in Computer Science',
    'BSc ',' Bachelor of Science',
    'BCA ',' Bachelor of Computer Applications',
    'BCE ',' Bachelor of Computer Engineering',
    'BE ',' Bachelor of Engineering',
    'BTech ',' Bachelor of Technology',
    'BBA ',' Bachelor of Business Administration',
    'BBS ',' Bachelor of Business Studies',
    'BBM ',' Bachelor of Business Management',
    'BIT ',' Bachelor of Information Technology',
    'BIM ',' Bachelor of Information Management',
    'BCS ',' Bachelor of Computer Science',
    'BSE ',' Bachelor of Software Engineering',
    'BEng ',' Bachelor of Engineering',
    'BME ',' Bachelor of Mechanical Engineering',
    'BEE ',' Bachelor of Electrical Engineering',
    'BArch ',' Bachelor of Architecture',
    'BDS ',' Bachelor of Dental Surgery',
    'MBBS ',' Bachelor of Medicine and Bachelor of Surgery',
    'BPharm ',' Bachelor of Pharmacy',
    'BEd ',' Bachelor of Education',
    'BA ',' Bachelor of Arts',
    'BCom ',' Bachelor of Commerce',
    'BFA ',' Bachelor of Fine Arts',
    'BSc Nursing ',' Bachelor of Science in Nursing',

    # Master's Degrees
    'MSc.CSIT ',' Master of Science in Computer Science and Information Technology',
    'MSc.IT ',' Master of Science in Information Technology',
    'MSc.CS ',' Master of Science in Computer Science',
    'MSc ',' Master of Science',
    'MCA ',' Master of Computer Applications',
    'MTech ',' Master of Technology',
    'ME ',' Master of Engineering',
    'MSE ',' Master of Software Engineering',
    'MIT ',' Master of Information Technology',
    'MBA ',' Master of Business Administration',
    'MBS ',' Master of Business Studies',
    'MBM ',' Master of Business Management',
    'MIM ',' Master of Information Management',
    'MS ',' Master of Science',
    'MEng ',' Master of Engineering',
    'MArch ',' Master of Architecture',
    'MPharm ',' Master of Pharmacy',
    'MDS ',' Master of Dental Surgery',
    'MD ',' Doctor of Medicine',
    'LLM ',' Master of Laws',
    'MA ',' Master of Arts',
    'MEd ',' Master of Education',
    'MCom ',' Master of Commerce',
    'MPA ',' Master of Public Administration',

    # Doctorate Degrees
    'PhD ',' Doctor of Philosophy',
    'DSc ',' Doctor of Science',
    'DLitt ',' Doctor of Literature',
    'DBA ',' Doctor of Business Administration',
    'EdD ',' Doctor of Education',
    'JD ',' Juris Doctor',
    'MD ',' Doctor of Medicine',
    'DS ',' Doctor of Surgery',

    # Associate Degrees & Diplomas
    'AD ',' Associate Degree',
    'ADIT ',' Associate Degree in Information Technology',
    'ADS ',' Associate Degree in Science',
    'AA ',' Associate of Arts',
    'AAS ',' Associate of Applied Science',
    'ASE ',' Associate of Software Engineering',
    'AS ',' Associate of Science',
    'Diploma in Computer Science',
    'Diploma in Information Technology',
    'Diploma in Engineering',
    'Diploma in Business Administration',
    'Diploma in Data Science',
    'Diploma in Cybersecurity',
    'Diploma in Artificial Intelligence',

    # Specialized Fields
    'Bachelor\'s in Data Science',
    'Bachelor\'s inMachine Learning',
    'Bachelor\'s inArtificial Intelligence',
    'Bachelor\'s inSoftware Engineering',
    'Bachelor\'s inCybersecurity',
    'Bachelor\'s inCloud Computing',
    'Bachelor\'s inBlockchain Technology',
    'Bachelor\'s inNetwork Engineering',
    'Bachelor\'s inDatabase Administration',
    'Bachelor\'s inRobotics',
    'Bachelor\'s inEmbedded Systems',
    'Bachelor\'s in of Things (IoT)',
    'Bachelor\'s inBioinformatics',
    'Bachelor\'s inGame Development',
    'Bachelor\'s inDigital Marketing',
    'Bachelor\'s inStatistics',
    'Bachelor\'s inMathematics',
    'Bachelor\'s inPhysics',
    'Bachelor\'s in',
    'Bachelor\'s inPublic Administration',
    'Bachelor\'s inJournalism & Mass Communication',
]

def extract_skills(text, skills):
    found_skills = []
    for skill in skills:
        if re.search(r'\b' + re.escape(skill) + r'\b', text, re.IGNORECASE):
            found_skills.append(skill)
        #recommend garne bela input string ma xa
    res_skills = " ".join(found_skills)
    return res_skills

def extract_education(text, education):
    found_education = []
    for edu in education:
        if re.search(r'\b' + re.escape(edu) + r'\b', text, re.IGNORECASE):
            found_education.append(edu)
    res_education = " ".join(found_education)
    return res_education
