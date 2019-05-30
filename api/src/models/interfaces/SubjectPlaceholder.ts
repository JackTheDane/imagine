import { Topic } from './Topic';

export interface SubjectPlacerholder {
  // The placeholder indicates the number of letters in each word of the Subject, with spaces between
  placeholder: number[];
  topic: Topic;
}
