import { useEffect, useRef, useState } from 'react';
import { Shield } from 'lucide-react';
import type { Product } from '../../types/store';

interface ProductMediaProps {
  product: Pick<
    Product,
    'name' | 'brand' | 'colorway' | 'image' | 'imageCropClass' | 'imageFilterStyle'
  >;
  className?: string;
  imgClassName?: string;
  fit?: 'cover' | 'contain';
  loading?: 'eager' | 'lazy';
}

export function ProductMedia({
  product,
  className = '',
  imgClassName = '',
  fit = 'cover',
  loading = 'lazy',
}: ProductMediaProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setFailed(false);
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true);
    } else {
      setLoaded(false);
    }
  }, [product.image]);

  if (failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#EAE7DF] to-[#DFDBD0] p-6 text-center text-[#0E1113] ${className}`}
      >
        <Shield className="mb-2 h-8 w-8 text-[#5A5D57]" strokeWidth={1.5} />
        <p className="font-display text-sm font-semibold tracking-tight">{product.name}</p>
        <p className="mt-1 text-xs text-[#5A5D57]">{product.colorway}</p>
      </div>
    );
  }

  const fitClass = fit === 'contain' ? 'object-contain' : 'object-cover';

  return (
    <div className={`relative overflow-hidden bg-[#EAE7DF] ${className}`}>
      {!loaded && (
        <div
          aria-hidden="true"
          className="skeleton-shimmer pointer-events-none absolute inset-0 z-10"
        />
      )}
      <img
        ref={imgRef}
        src={product.image}
        alt={`${product.name} — ${product.colorway}`}
        referrerPolicy="no-referrer"
        loading={loading}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setLoaded(true);
          setFailed(true);
        }}
        style={product.imageFilterStyle ? { filter: product.imageFilterStyle } : undefined}
        className={`h-full w-full ${fitClass} transition-[opacity,transform] duration-500 ease-out ${
          loaded ? 'opacity-100' : 'opacity-0'
        } ${product.imageCropClass ?? 'object-center'} ${imgClassName}`}
      />
    </div>
  );
}
