export const INDIAN_STATE_CITIES: Record<string, string[]> = {
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Tirupati', 'Kurnool', 'Rajahmundry', 'Kakinada'],
  'Arunachal Pradesh': ['Itanagar', 'Naharlagun', 'Pasighat', 'Tawang', 'Ziro', 'Bomdila'],
  Assam: ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tezpur', 'Tinsukia'],
  Bihar: ['Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur', 'Darbhanga', 'Purnia', 'Bihar Sharif'],
  Chhattisgarh: ['Raipur', 'Bhilai', 'Bilaspur', 'Durg', 'Korba', 'Rajnandgaon', 'Jagdalpur'],
  Goa: ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda', 'Bicholim'],
  Gujarat: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar', 'Bhavnagar', 'Jamnagar', 'Junagadh'],
  Haryana: ['Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Karnal', 'Hisar', 'Rohtak', 'Sonipat'],
  'Himachal Pradesh': ['Shimla', 'Dharamshala', 'Solan', 'Mandi', 'Kullu', 'Manali', 'Hamirpur'],
  Jharkhand: ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Deoghar', 'Hazaribagh', 'Giridih'],
  Karnataka: ['Bengaluru', 'Mysuru', 'Mangaluru', 'Hubballi', 'Belagavi', 'Davanagere', 'Ballari', 'Shivamogga'],
  Kerala: ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Kannur', 'Alappuzha', 'Kottayam'],
  'Madhya Pradesh': ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Rewa', 'Satna'],
  Maharashtra: ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Thane', 'Aurangabad', 'Solapur', 'Kolhapur'],
  Manipur: ['Imphal', 'Thoubal', 'Bishnupur', 'Churachandpur', 'Ukhrul'],
  Meghalaya: ['Shillong', 'Tura', 'Jowai', 'Nongpoh', 'Cherrapunji'],
  Mizoram: ['Aizawl', 'Lunglei', 'Champhai', 'Kolasib', 'Serchhip'],
  Nagaland: ['Kohima', 'Dimapur', 'Mokokchung', 'Wokha', 'Tuensang'],
  Odisha: ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', 'Puri', 'Balasore'],
  Punjab: ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Pathankot'],
  Rajasthan: ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer', 'Bikaner', 'Alwar', 'Bharatpur'],
  Sikkim: ['Gangtok', 'Namchi', 'Gyalshing', 'Mangan', 'Rangpo'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tiruppur', 'Vellore', 'Erode'],
  Telangana: ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam', 'Ramagundam', 'Mahbubnagar'],
  Tripura: ['Agartala', 'Udaipur', 'Dharmanagar', 'Kailasahar', 'Belonia'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Noida', 'Ghaziabad', 'Agra', 'Varanasi', 'Prayagraj', 'Meerut', 'Gorakhpur'],
  Uttarakhand: ['Dehradun', 'Haridwar', 'Haldwani', 'Roorkee', 'Rishikesh', 'Rudrapur', 'Nainital'],
  'West Bengal': ['Kolkata', 'Howrah', 'Siliguri', 'Durgapur', 'Asansol', 'Darjeeling', 'Kharagpur'],
  Delhi: ['New Delhi', 'Central Delhi', 'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi', 'Dwarka', 'Rohini'],
  'Jammu and Kashmir': ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Udhampur', 'Sopore'],
  Ladakh: ['Leh', 'Kargil', 'Diskit'],
  Puducherry: ['Puducherry', 'Karaikal', 'Mahe', 'Yanam'],
}

export function getCitiesForState(state: string, currentCity = ''): string[] {
  const cities = INDIAN_STATE_CITIES[state] ?? []
  if (currentCity && !cities.includes(currentCity)) return [currentCity, ...cities]
  return cities
}
