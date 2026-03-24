import { useParams } from "react-router-dom";

export default function EditStudent() {
  const { id } = useParams();

  return <div>Edit Student {id}</div>;
}