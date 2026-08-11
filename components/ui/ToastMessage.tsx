type ToastMessageProps = {
  title: string;
  description?: string;
};

export default function ToastMessage({ title, description }: ToastMessageProps) {
  return (
    <div className="dxg-toast-message">
      <p className="dxg-toast-message-title">{title}</p>
      {description ? <p className="dxg-toast-message-description">{description}</p> : null}
    </div>
  );
}
