declare module "firebase/firestore" {
  export type Firestore = object;
  export interface DocumentReference {
    id: string;
  }
  export interface DocumentSnapshot {
    exists(): boolean;
    data(): Record<string, unknown> | undefined;
    id: string;
  }
  export interface QuerySnapshot {
    docs: Array<{ id: string; data(): Record<string, unknown> }>;
  }
  export type QueryConstraint = object;

  export function getFirestore(app?: unknown): Firestore;
  export function doc(
    firestore: Firestore,
    collectionPath: string,
    ...documentPaths: string[]
  ): DocumentReference;
  export function getDoc(ref: DocumentReference): Promise<DocumentSnapshot>;
  export function collection(firestore: Firestore, path: string): unknown;
  export function getDocs(query: unknown): Promise<QuerySnapshot>;
  export function query(
    collectionRef: unknown,
    ...queryConstraints: QueryConstraint[]
  ): unknown;
  export function where(
    fieldPath: string,
    opStr: "<" | "<=" | "==" | "!=" | ">=" | ">",
    value: unknown
  ): QueryConstraint;
  export function addDoc(
    collectionRef: unknown,
    data: Record<string, unknown>
  ): Promise<DocumentReference>;
  export function setDoc(
    ref: DocumentReference,
    data: Record<string, unknown>
  ): Promise<void>;
  export function updateDoc(
    ref: DocumentReference,
    data: Record<string, unknown>
  ): Promise<void>;
  export function deleteDoc(ref: DocumentReference): Promise<void>;
  export function onSnapshot(
    ref: DocumentReference,
    onNext: (snapshot: DocumentSnapshot) => void,
    onError?: (error: Error) => void
  ): () => void;
}