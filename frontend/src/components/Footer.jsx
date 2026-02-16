export default function Footer() {
	return (
		<footer className="w-full border-t bg-white">
			<div className="container mx-auto px-8 py-8 text-center">
				<div className="text-sm font-semibold">Клиент говорит</div>
				<div className="mt-4 text-xs text-gray-400">
					©{new Date().getFullYear()}
				</div>
			</div>
		</footer>
	);
}
