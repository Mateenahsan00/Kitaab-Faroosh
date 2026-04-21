/**
 * Kitaab Faroosh — Pakistan Cities Dataset
 */
const pakistanCities = [
    "Abbottabad", "Astore", "Attock", "Awaran", "Badin", "Bagh", "Bahawalnagar", "Bahawalpur", "Bannu", "Barkhan", 
    "Bhakkar", "Bhimber", "Bolan", "Buner", "Chagai", "Chakwal", "Charsadda", "Chilas", "Chiniot", "Chitral", 
    "Dadu", "Dera Ghazi Khan", "Dera Ismail Khan", "Diamer", "Duki", "Faisalabad", "Ghotki", "Gilgit", "Ghizer", 
    "Gojal", "Gujranwala", "Gujrat", "Gwadar", "Hafizabad", "Haripur", "Harnai", "Hattian Bala", "Hyderabad", 
    "Hunza", "Islamabad", "Jacobabad", "Jaffarabad", "Jamshoro", "Jhang", "Jhelum", "Kalat", "Kamalia", "Karachi", 
    "Kasur", "Kech", "Khairpur", "Kharan", "Khushab", "Khuzdar", "Kohat", "Kotli", "Lahore", "Lakki Marwat", "Larkana", 
    "Lasbela", "Layyah", "Lodhran", "Loralai", "Mandi Bahauddin", "Mardan", "Mastung", "Matiari", "Mianwali", 
    "Mirpur", "Mirpur Khas", "Multan", "Muzaffarabad", "Muzaffargarh", "Nagar", "Narowal", "Naseerabad", "Nowshera", 
    "Nushki", "Okara", "Pakpattan", "Panjgur", "Peshawar", "Pishin", "Quetta", "Rahim Yar Khan", "Rajanpur", 
    "Rawalakot", "Rawalpindi", "Sahiwal", "Sanghar", "Sargodha", "Shangla", "Sheikhupura", "Shigar", "Shikarpur", 
    "Sialkot", "Sibi", "Skardu", "Sujawal", "Sukkur", "Swabi", "Swat", "Tando Adam", "Tando Allahyar", "Tando Muhammad Khan", 
    "Tank", "Thatta", "Tharparkar", "Toba Tek Singh", "Turbat", "Umerkot", "Vehari", "Washuk", "Zhob", "Ziarat"
].sort();



if (typeof module !== 'undefined' && module.exports) {
    // CommonJS/Node export for server-side or tooling use.
    module.exports = pakistanCities;
} else {
    // Browser global assignment for static pages and client-side scripts.
    window.pakistanCities = pakistanCities;
}
