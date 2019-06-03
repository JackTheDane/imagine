import { Topic } from '../models/interfaces/Topic';
export const topics: {
  film: Topic;
  fictionalCharacter: Topic;
  event: Topic;
  book: Topic;
  tvShow: Topic;
  videoGame: Topic;
} = {
  film: {
    name: 'Film',
    iconName: 'movie'
  },
  fictionalCharacter: {
    name: 'Fictional Character',
    iconName: 'face'
  },
  event: {
    name: 'Event',
    iconName: 'event'
  },
  book: {
    name: 'Book',
    iconName: 'book'
  },
  tvShow: {
    name: 'TV Show',
    iconName: 'tv'
  },
  videoGame: {
    name: 'Video Game',
    iconName: 'videogame_asset'
  }
}
