import { Subject } from '../models/interfaces/Subject';
import { topics } from './topics';

export const subjects: Subject[] = [
  // Films
  {
    text: 'Pirates of the Carribean',
    topic: topics.film
  },
  {
    text: 'Shrek',
    topic: topics.film
  },
  {
    text: 'Titanic',
    topic: topics.film
  },
  // Characters
  {
    text: 'Harry Potter',
    topic: topics.fictionalCharacter
  },
  {
    text: 'Jack Sparrow',
    topic: topics.fictionalCharacter
  },
  {
    text: 'Jon Snow',
    topic: topics.fictionalCharacter
  },
  {
    text: 'Hulk',
    topic: topics.fictionalCharacter
  },
  // Books
  {
    text: 'Lord of the Rings',
    topic: topics.book
  },
  {
    text: 'Bible',
    topic: topics.book
  },
  // Events
  {
    text: 'Moon Landing',
    topic: topics.event
  },
  // TV Show
  {
    text: 'Game of Thrones',
    topic: topics.tvShow
  },
  {
    text: 'Breaking Bad',
    topic: topics.tvShow
  },
  {
    text: 'Black Mirror',
    topic: topics.tvShow
  },
  // Video Games
  {
    text: 'Call of Duty',
    topic: topics.videoGame
  },
  {
    text: 'World of Warcraft',
    topic: topics.videoGame
  },
  {
    text: 'Skyrim',
    topic: topics.videoGame
  }
]
