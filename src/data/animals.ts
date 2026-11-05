// Pet animal types + breeds (real-world lists, with the common Indian breeds first where it matters).
// The Add Pet screen merges these with whatever breeds the server already has (GET /visit-types/breeds/:animal),
// so breeds added by users still show up. Every list ends with "Mixed Breed / Other" so nobody is ever stuck.

export const OTHER_BREED = 'Mixed Breed / Other';

export const ANIMALS: { type: string; emoji: string; breeds: string[] }[] = [
  {
    type: 'Dog', emoji: '🐶',
    breeds: [
      'Indian Pariah', 'Indian Spitz', 'Rajapalayam', 'Kombai', 'Chippiparai', 'Mudhol Hound', 'Rampur Greyhound', 'Caravan Hound', 'Gaddi Kutta', 'Bakharwal',
      'Labrador Retriever', 'Golden Retriever', 'German Shepherd', 'Beagle', 'Pug', 'Shih Tzu', 'Pomeranian', 'Rottweiler', 'Doberman Pinscher', 'Boxer',
      'Siberian Husky', 'Great Dane', 'Cocker Spaniel', 'Dachshund', 'Lhasa Apso', 'Saint Bernard', 'English Bulldog', 'French Bulldog', 'Poodle', 'Dalmatian',
      'Border Collie', 'Chihuahua', 'Maltese', 'Yorkshire Terrier', 'Jack Russell Terrier', 'Cane Corso', 'Akita', 'Samoyed', 'American Pit Bull Terrier', 'Bullmastiff',
      'Mastiff', 'Great Pyrenees', 'Australian Shepherd', 'Basset Hound', 'Bloodhound', 'Weimaraner', 'Alaskan Malamute', 'Irish Setter', 'English Springer Spaniel', 'Pekingese',
      'Papillon', 'Havanese', 'Bichon Frise', 'Belgian Malinois', 'Collie', 'Greyhound', 'Pembroke Welsh Corgi', 'Shiba Inu', 'Chow Chow', 'Tibetan Mastiff',
      'West Highland White Terrier', 'Miniature Schnauzer', 'Airedale Terrier', 'Staffordshire Bull Terrier', 'Vizsla', 'Newfoundland', 'Bernese Mountain Dog', 'Afghan Hound', 'Whippet', 'Boston Terrier',
      OTHER_BREED,
    ],
  },
  {
    type: 'Cat', emoji: '🐱',
    breeds: [
      'Indian Domestic (Billi)', 'Persian', 'Siamese', 'Maine Coon', 'Bengal', 'Ragdoll', 'British Shorthair', 'Sphynx', 'Scottish Fold', 'Abyssinian',
      'Russian Blue', 'Birman', 'Norwegian Forest Cat', 'American Shorthair', 'Himalayan', 'Burmese', 'Oriental Shorthair', 'Devon Rex', 'Cornish Rex', 'Exotic Shorthair',
      'Siberian', 'Turkish Angora', 'Turkish Van', 'Savannah', 'Tonkinese', 'Manx', 'Egyptian Mau', 'Balinese', 'Ocicat', 'Munchkin',
      'Bombay', 'Chartreux', 'Somali', 'American Curl', 'Selkirk Rex', 'Japanese Bobtail', 'Singapura', 'Korat', 'LaPerm', 'Pixie-bob',
      OTHER_BREED,
    ],
  },
  {
    type: 'Rabbit', emoji: '🐰',
    breeds: [
      'European Rabbit', 'Holland Lop', 'Mini Lop', 'Netherland Dwarf', 'Lionhead', 'Mini Rex', 'Rex', 'Flemish Giant', 'English Angora', 'French Lop',
      'Dutch', 'Polish', 'Himalayan', 'Californian', 'New Zealand White', 'Belgian Hare', 'English Lop', 'Harlequin', 'Jersey Wooly', 'Silver Marten',
      'Chinchilla', 'Checkered Giant', 'Tan', 'Satin', 'American Fuzzy Lop', 'Dwarf Hotot',
      OTHER_BREED,
    ],
  },
  {
    type: 'Guinea Pig', emoji: '🐭',
    breeds: ['American', 'Abyssinian', 'Peruvian', 'Silkie (Sheltie)', 'Teddy', 'Texel', 'Coronet', 'Skinny Pig', 'Baldwin', 'Crested', 'White Crested', 'Rex', OTHER_BREED],
  },
  {
    type: 'Hamster', emoji: '🐹',
    breeds: ['Syrian (Golden) Hamster', 'Roborovski Dwarf Hamster', "Campbell's Dwarf Hamster", 'Winter White Dwarf Hamster', 'Chinese Hamster', 'Teddy Bear Hamster', 'Fancy Hamster', OTHER_BREED],
  },
  {
    type: 'Ferret', emoji: '🦦',
    breeds: ['Sable', 'Albino', 'Silver', 'Cinnamon', 'Champagne', 'Chocolate', 'Black Sable', 'Dark-eyed White', 'Panda', 'Siamese', OTHER_BREED],
  },
  {
    type: 'Bird', emoji: '🐦',
    breeds: [
      'Budgerigar (Budgie)', 'Cockatiel', 'Lovebird', 'Canary', 'Zebra Finch', 'Java Sparrow', 'Society Finch', 'Gouldian Finch', 'Bengalese Finch', 'Diamond Dove',
      'Ringneck Dove', 'Fantail Pigeon', 'Racing Pigeon', 'Indian Myna', 'Parakeet', 'Bulbul', 'Mynah', 'Duck', 'Chicken (Pet)', 'Quail',
      OTHER_BREED,
    ],
  },
  {
    type: 'Parrot', emoji: '🦜',
    breeds: [
      'Indian Ringneck Parakeet', 'Alexandrine Parakeet', 'Plum-headed Parakeet', 'African Grey', 'Eclectus Parrot', 'Blue-and-gold Macaw', 'Scarlet Macaw', 'Green-winged Macaw', 'Hyacinth Macaw', 'Sun Conure',
      'Green-cheeked Conure', 'Jenday Conure', 'Quaker (Monk) Parakeet', 'Sulphur-crested Cockatoo', 'Umbrella Cockatoo', 'Moluccan Cockatoo', 'Amazon Parrot', 'Senegal Parrot', 'Caique', 'Rainbow Lorikeet',
      'Eastern Rosella', 'Pionus', 'Kakariki', 'Lovebird',
      OTHER_BREED,
    ],
  },
  {
    type: 'Fish', emoji: '🐟',
    breeds: [
      'Goldfish', 'Betta (Fighter)', 'Guppy', 'Molly', 'Platy', 'Swordtail', 'Neon Tetra', 'Angelfish', 'Oscar', 'Discus',
      'Koi', 'Arowana', 'Flowerhorn', 'Tiger Barb', 'Dwarf Gourami', 'Zebra Danio', 'Corydoras', 'Common Pleco', 'Clownfish', 'Blue Tang',
      'Siamese Algae Eater', 'Rainbow Shark', 'Red-tailed Black Shark', 'Silver Dollar', 'Severum', 'Kribensis', 'Convict Cichlid', 'Jack Dempsey', 'Parrot Cichlid', 'Redtail Catfish',
      OTHER_BREED,
    ],
  },
  {
    type: 'Turtle', emoji: '🐢',
    breeds: [
      'Indian Star Tortoise', 'Indian Flapshell Turtle', 'Indian Roofed Turtle', 'Indian Black Turtle', 'Red-eared Slider', 'Yellow-bellied Slider', 'Painted Turtle', 'Common Musk Turtle', 'Common Map Turtle', 'Eastern Box Turtle',
      'Russian Tortoise', 'Sulcata (African Spurred) Tortoise', "Hermann's Tortoise", 'Greek Tortoise', 'Leopard Tortoise', 'Red-footed Tortoise', 'Hingeback Tortoise',
      OTHER_BREED,
    ],
  },
  {
    type: 'Lizard', emoji: '🦎',
    breeds: ['Bearded Dragon', 'Leopard Gecko', 'Crested Gecko', 'Green Iguana', 'Blue-tongued Skink', 'Chameleon (Veiled)', 'Chinese Water Dragon', 'Tokay Gecko', 'Savannah Monitor', 'Uromastyx', OTHER_BREED],
  },
  {
    type: 'Horse', emoji: '🐴',
    breeds: [
      'Marwari', 'Kathiawari', 'Manipuri Pony', 'Spiti Pony', 'Zanskari Pony', 'Bhutia Pony', 'Arabian', 'Thoroughbred', 'American Quarter Horse', 'Clydesdale',
      'Friesian', 'Appaloosa', 'Mustang', 'Morgan', 'Shetland Pony', 'Percheron', 'Andalusian', 'Hanoverian', 'Lipizzaner', 'Paint Horse',
      'Tennessee Walking Horse', 'Welsh Pony', 'Haflinger', 'Akhal-Teke', 'Shire',
      OTHER_BREED,
    ],
  },
];

export const animalTypes: string[] = ANIMALS.map((a) => a.type);
export const breedsByType: Record<string, string[]> = Object.fromEntries(ANIMALS.map((a) => [a.type, a.breeds]));
export const speciesEmoji: Record<string, string> = { ...Object.fromEntries(ANIMALS.map((a) => [a.type, a.emoji])), Other: '🐾' };