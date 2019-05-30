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
    iconName: 'film'
  },
  fictionalCharacter: {
    name: 'Fictional Character',
    iconName: 'user-astronaut'
  },
  event: {
    name: 'Event',
    iconName: 'rocket'
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
    iconName: 'gamepad'
  }
}
