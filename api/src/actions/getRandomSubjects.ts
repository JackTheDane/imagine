import { Subject } from "../models/interfaces/Subject";
import { subjects } from "../config/subjects";

export function getRandomSubjects(numberToGet: number, excludedSubjects: string[] = []): Subject[] {

  // Filter the Subjects
  const filteredSubjects: Subject[] = subjects.filter(
    (subject: Subject): boolean => !excludedSubjects.includes(subject.text)
  );

  console.log(filteredSubjects);

  if (filteredSubjects.length < numberToGet) {
    return filteredSubjects;
  }

  const returnArray: Subject[] = [];

  for (let i = 0; i < numberToGet; i++) {
    const subjectIndex: number = Math.floor(Math.random() * (filteredSubjects.length - 1));
    const newSubject: Subject = filteredSubjects.splice(subjectIndex, 1)[0];
    returnArray.push(newSubject);
  }

  console.log(returnArray);

  return returnArray;
}
